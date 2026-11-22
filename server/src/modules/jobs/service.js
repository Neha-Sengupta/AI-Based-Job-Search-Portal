import mongoose from "mongoose";
import { FIT_CARD_MISSING } from "shared/constants/fit";
import { SOURCE_ATTRIBUTION } from "shared/constants/jobs";
import { calculateFit } from "shared/logic/fit";
import { GENERIC_ROLE_WORDS } from "shared/constants/tailoring";
import { AppError } from "../../lib/errors.js";
import { Application } from "../applications/model.js";
import { findProfile } from "../profile/service.js";
import { Job } from "./model.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const RECOMMENDED_POOL_SIZE = 500;
const CARD_FIELDS =
  "title company location workModel jobType experienceLevel salary postedAt source requirements";

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const fitInput = (job) =>
  job.requirements && {
    ...job.requirements,
    workModel: job.workModel,
    country: job.location?.country,
  };

export function cardFit(profile, job) {
  if (!profile) return undefined;
  const fit = calculateFit(profile, fitInput(job));
  if (fit.status) return { status: fit.status };
  return {
    score: fit.score,
    verdict: fit.verdict,
    missing: fit.missing.slice(0, FIT_CARD_MISSING),
  };
}

function toCard(job, profile) {
  const card = {
    id: String(job._id),
    title: job.title,
    company: job.company,
    location: job.location,
    workModel: job.workModel,
    jobType: job.jobType,
    experienceLevel: job.experienceLevel,
    salary: job.salary ?? null,
    postedAt: job.postedAt,
    source: job.source,
  };
  const fit = cardFit(profile, job);
  return fit ? { ...card, fit } : card;
}

function buildFilter(query) {
  const filter = {};
  if (query.q) filter.$text = { $search: query.q };
  if (query.country) filter["location.country"] = query.country;
  if (query.city) filter["location.city"] = new RegExp(`^${escapeRegex(query.city)}`, "i");
  if (query.workModel) filter.workModel = { $in: query.workModel };
  if (query.jobType) filter.jobType = { $in: query.jobType };
  if (query.experienceLevel) filter.experienceLevel = { $in: query.experienceLevel };
  if (query.postedWithin)
    filter.postedAt = { $gte: new Date(Date.now() - Number(query.postedWithin) * MS_PER_DAY) };
  return filter;
}

export async function searchJobs(query, userId) {
  const filter = buildFilter(query);
  const byRelevance = query.q && query.sort !== "newest";
  const projection = byRelevance ? { score: { $meta: "textScore" } } : {};
  const sort = byRelevance ? { score: { $meta: "textScore" }, postedAt: -1 } : { postedAt: -1 };
  const [jobs, total, profile] = await Promise.all([
    Job.find(filter, projection)
      .select(CARD_FIELDS)
      .sort(sort)
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    Job.countDocuments(filter),
    userId ? findProfile(userId) : null,
  ]);
  return {
    data: jobs.map((job) => toCard(job, profile)),
    meta: { page: query.page, limit: query.limit, total },
  };
}

// Jobs matching the user's preferences, sorted by fit. Scores the newest matching jobs in memory.
// "Frontend Developer" → titles containing "frontend". Generic words (developer, engineer…) alone match too much.
export function roleTitlePattern(roles = []) {
  const words = [
    ...new Set(
      roles
        .flatMap((role) => role.toLowerCase().split(/[^a-z0-9+#.]+/))
        .filter((word) => word.length > 1 && !GENERIC_ROLE_WORDS.includes(word)),
    ),
  ];
  return words.length
    ? new RegExp(words.map((word) => `\\b${escapeRegex(word)}`).join("|"), "i")
    : null;
}

export async function recommendedJobs({ page, limit }, userId) {
  const profile = await findProfile(userId);
  if (!profile) throw new AppError("NOT_FOUND", "Create your profile first.");
  const { countries = [], workModels = [], jobTypes = [], roles = [] } = profile.preferences ?? {};
  const filter = {};
  if (countries.length)
    filter.$or = [{ "location.country": { $in: countries } }, { workModel: "remote" }];
  if (workModels.length) filter.workModel = { $in: [...workModels, "unknown"] };
  if (jobTypes.length) filter.jobType = { $in: [...jobTypes, "unknown"] };
  const roleTitle = roleTitlePattern(roles);
  if (roleTitle) filter.title = roleTitle;

  // ponytail: scores up to 500 jobs per request; cache per user+job if this gets slow (architecture §7).
  const pool = await Job.find(filter)
    .select(CARD_FIELDS)
    .sort({ postedAt: -1 })
    .limit(RECOMMENDED_POOL_SIZE)
    .lean();
  const ranked = pool
    .map((job) => toCard(job, profile))
    .sort((a, b) => (b.fit?.score ?? -1) - (a.fit?.score ?? -1));
  return {
    data: ranked.slice((page - 1) * limit, page * limit),
    meta: { page, limit, total: ranked.length },
  };
}

export async function getJob(id, userId) {
  const job = await Job.findById(id).lean();
  if (!job) throw new AppError("NOT_FOUND", "This job is no longer available.");
  const detail = {
    ...toCard(job, null),
    description: job.description,
    applyUrl: job.applyUrl,
    requirements: job.requirements
      ? {
          mustHave: job.requirements.mustHave,
          niceToHave: job.requirements.niceToHave,
          minYears: job.requirements.minYears,
          education: job.requirements.education,
        }
      : null,
    attribution: SOURCE_ATTRIBUTION[job.source] ?? null,
  };
  if (!userId) return detail;

  const [profile, application] = await Promise.all([
    findProfile(userId),
    Application.findOne({ userId, jobId: job._id }).select("status cvId").lean(),
  ]);
  const fit = profile ? calculateFit(profile, fitInput(job)) : null;
  return {
    ...detail,
    fit:
      fit &&
      (fit.status
        ? { status: fit.status }
        : {
            score: fit.score,
            verdict: fit.verdict,
            breakdown: fit.breakdown,
            missing: fit.missing,
            missingSkills: fit.missingSkills,
          }),
    application: application
      ? {
          id: String(application._id),
          status: application.status,
          cvId: application.cvId ? String(application.cvId) : null,
        }
      : null,
  };
}

export const isJobId = (id) => mongoose.isValidObjectId(id);
