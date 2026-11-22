// The job import pipeline: fetch every source → dedupe → extract requirements by
// rules → upsert → purge old jobs. Safe to run twice (F4.8).
import { JOB_MAX_AGE_DAYS, REQUIREMENTS_VERSION } from "shared/constants/jobs";
import { makeDedupeKey } from "shared/logic/jobs";
import { extractRequirements } from "shared/logic/requirements";
import { Job } from "./model.js";
import { SOURCES } from "./sources/index.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function requirementsFor(description, now = new Date()) {
  const extracted = extractRequirements(description);
  return extracted
    ? { ...extracted, extractedAt: now, extractorVersion: REQUIREMENTS_VERSION }
    : null;
}

async function importOne(job, counts) {
  const dedupeKey = makeDedupeKey({
    title: job.title,
    company: job.company,
    city: job.location.city,
  });
  const existing = await Job.findOne({ source: job.source, sourceId: job.sourceId })
    .select("_id")
    .lean();
  if (existing) {
    counts.skippedDuplicate += 1;
    return;
  }
  if (await Job.exists({ dedupeKey })) {
    counts.skippedDuplicate += 1; // the same job already arrived from another source (F4.9)
    return;
  }
  const requirements = requirementsFor(job.description);
  if (!requirements) counts.extractionFailed += 1;
  try {
    await Job.create({ ...job, dedupeKey, requirements });
    counts.created += 1;
  } catch (error) {
    // Two imports racing on the same job: the unique index wins, which is fine.
    if (error.code !== 11000) throw error;
    counts.skippedDuplicate += 1;
  }
}

// Jobs extracted by an older version of the rules get re-extracted (it's free and instant).
async function refreshOldRequirements() {
  const stale = await Job.find({ "requirements.extractorVersion": { $ne: REQUIREMENTS_VERSION } })
    .select("description")
    .lean();
  for (const job of stale) {
    await Job.updateOne(
      { _id: job._id },
      { $set: { requirements: requirementsFor(job.description) } },
    );
  }
  return stale.length;
}

export async function runImport({
  sources,
  maxPerSource = 0,
  companiesFile,
  logger,
  now = new Date(),
}) {
  const counts = {
    fetched: 0,
    created: 0,
    skippedDuplicate: 0,
    skippedInvalid: 0,
    extractionFailed: 0,
    purged: 0,
    refreshed: 0,
  };

  for (const name of sources) {
    const source = SOURCES[name];
    if (!source) {
      logger.warn({ source: name }, "Unknown job source in JOB_SOURCES; skipped");
      continue;
    }
    try {
      const { jobs, skipped } = await source.fetchJobs({
        maxJobs: maxPerSource,
        companiesFile,
        logger,
      });
      counts.fetched += jobs.length;
      counts.skippedInvalid += skipped;
      for (const job of jobs) await importOne(job, counts);
    } catch (error) {
      // One broken source must not stop the others.
      logger.error({ err: error, source: name }, "Job source failed");
    }
  }

  counts.refreshed = await refreshOldRequirements();
  const cutoff = new Date(now.getTime() - JOB_MAX_AGE_DAYS * MS_PER_DAY);
  counts.purged = (await Job.deleteMany({ postedAt: { $lt: cutoff } })).deletedCount;

  logger.info(counts, "Job import finished");
  return counts;
}
