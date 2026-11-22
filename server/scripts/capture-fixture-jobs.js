// One-off: captures ~200 India jobs from the live Greenhouse, Lever and Ashby APIs into
// src/modules/jobs/sources/__fixtures__/jobs.json (offline dev + `npm run db:seed`).
// Calls the network, so it is never run by tests. Usage: node server/scripts/capture-fixture-jobs.js
import { writeFile } from "node:fs/promises";
import pino from "pino";
import { JOB_MAX_AGE_DAYS } from "shared/constants/jobs";
import * as ashby from "../src/modules/jobs/sources/ashby.js";
import * as greenhouse from "../src/modules/jobs/sources/greenhouse.js";
import * as lever from "../src/modules/jobs/sources/lever.js";

const TARGET_JOBS = 200;
const MAX_PER_COMPANY = 8;
const MAX_DESCRIPTION_CHARS = 8000;
const DAY_MS = 24 * 60 * 60 * 1000;
const OUTPUT = new URL("../src/modules/jobs/sources/__fixtures__/jobs.json", import.meta.url);

const logger = pino({ level: "info" });
const minPostedAt = Date.now() - JOB_MAX_AGE_DAYS * DAY_MS;

const byCompany = new Map();
for (const source of [greenhouse, lever, ashby]) {
  const { jobs, skipped } = await source.fetchJobs({ logger });
  logger.info({ source: source.name, jobs: jobs.length, skipped }, "Fetched");
  for (const job of jobs) {
    if (job.postedAt.getTime() < minPostedAt) continue;
    const list = byCompany.get(job.company) ?? [];
    byCompany.set(job.company, [...list, job]);
  }
}

// Newest jobs first, then round-robin across companies so no single company dominates.
const queues = [...byCompany.values()].map((jobs) =>
  jobs.sort((a, b) => b.postedAt - a.postedAt).slice(0, MAX_PER_COMPANY),
);
const picked = [];
for (let round = 0; picked.length < TARGET_JOBS && round < MAX_PER_COMPANY; round += 1) {
  for (const queue of queues) {
    if (queue[round] && picked.length < TARGET_JOBS) picked.push(queue[round]);
  }
}

const fixtures = picked.map((job) => ({
  ...job,
  description: job.description.slice(0, MAX_DESCRIPTION_CHARS).trim(),
  postedAt: job.postedAt.toISOString(),
}));
await writeFile(OUTPUT, `${JSON.stringify(fixtures, null, 2)}\n`);

const counts = Object.fromEntries([...byCompany].map(([company, jobs]) => [company, jobs.length]));
logger.info({ written: fixtures.length, companies: byCompany.size, counts }, "Saved fixture jobs");
