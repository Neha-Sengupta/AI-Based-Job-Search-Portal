// Helpers shared by every job source adapter (fetching, validation, enum mapping).
import { readFile } from "node:fs/promises";
import { normalizedJobSchema } from "shared/schemas/job";

export const FETCH_TIMEOUT_MS = 10_000;
export const USER_AGENT =
  "JobSearchPortal/1.0 (+https://github.com/Neha-Sengupta/AI-Based-Job-Search-Portal)";

export async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${new URL(url).host}`);
  return response.json();
}

// Config and fixture files live next to the adapters (companies.json, careers.json, __fixtures__/).
export async function readSourceJson(file) {
  return JSON.parse(await readFile(new URL(file, import.meta.url), "utf8"));
}

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const describeIssues = (error) =>
  error.issues.map((issue) => `${issue.path.join(".") || "job"}: ${issue.message}`).join("; ");

// Collects validated jobs for one source. `build` maps a raw item to a job, or returns null
// when the job is filtered out (not open to India). Invalid or unmappable items are skipped
// and logged; they never fail the whole fetch.
export function createCollector({ source, maxJobs, logger }) {
  const jobs = [];
  let skipped = 0;

  const isFull = () => maxJobs > 0 && jobs.length >= maxJobs;
  const skip = (sourceId, reason) => {
    skipped += 1;
    logger.warn({ source, sourceId, reason }, "Skipped invalid job");
  };

  return {
    isFull,
    add(sourceId, build) {
      if (isFull()) return;
      let candidate;
      try {
        candidate = build();
      } catch (error) {
        return skip(sourceId, error.message);
      }
      if (candidate === null) return;
      const result = normalizedJobSchema.safeParse(candidate);
      if (result.success) jobs.push(result.data);
      else skip(sourceId, describeIssues(result.error));
    },
    result: () => ({ jobs, skipped }),
  };
}

// One request per company board (Greenhouse, Lever, Ashby). A failing board is logged and skipped.
export async function fetchBoards({ source, companiesFile, maxJobs, logger, fetchBoard }) {
  const companies = (await readSourceJson(companiesFile))[source] ?? [];
  const collector = createCollector({ source, maxJobs, logger });
  for (const company of companies) {
    if (collector.isFull()) break;
    try {
      await fetchBoard(company, collector);
    } catch (error) {
      logger.warn(
        { source, company: company.company, reason: error.message },
        "Board fetch failed",
      );
    }
  }
  return collector.result();
}

const JOB_TYPE_PATTERNS = [
  ["internship", /\bintern(ship)?\b|\bpraktikum\b|\bapprentice/i],
  ["contract", /\bcontract(or)?\b|\bfreelance|\btemporary\b|\bfixed[- ]term\b/i],
  ["part_time", /\bpart[\s_-]?time\b|\bwerkstudent/i],
  ["full_time", /\bfull[\s_-]?time\b|\bfulltime\b|\bpermanent\b/i],
];

// Employment-type text from the source ("Full-time", "FULL_TIME", "Intern") → JOB_JOB_TYPES.
// Without one, only an internship can be read safely from the title.
export function inferJobType(employmentType, title = "") {
  const text = [employmentType].flat().filter(Boolean).join(" ");
  const fromSource = JOB_TYPE_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0];
  if (fromSource) return fromSource;
  return JOB_TYPE_PATTERNS[0][1].test(title) ? "internship" : "unknown";
}

const EXPERIENCE_PATTERNS = [
  ["lead", /\b(lead|principal|staff|head of|director|vp)\b/i],
  ["senior", /\b(senior|sr\.?)(?![\p{L}])/iu],
  ["entry", /\b(intern(ship)?|junior|jr\.?|trainee|graduate|fresher|entry[- ]level)(?![\p{L}])/iu],
  ["mid", /\b(mid[- ]level|intermediate)\b/i],
];

export function inferExperienceLevel(title) {
  return EXPERIENCE_PATTERNS.find(([, pattern]) => pattern.test(title ?? ""))?.[0] ?? "unknown";
}

// Some boards fill salary fields with placeholders like 1–1 INR.
const MIN_PLAUSIBLE_SALARY = 10;
const SALARY_PERIOD_PATTERNS = [
  ["year", /year|annual|annum/i],
  ["month", /month/i],
  ["hour", /hour/i],
];

export function toSalary({ min, max, currency, interval }) {
  const period = SALARY_PERIOD_PATTERNS.find(([, pattern]) => pattern.test(interval ?? ""))?.[0];
  const low = Number.isFinite(min) ? min : null;
  const high = Number.isFinite(max) ? max : null;
  if (!period || !currency || Math.max(low ?? 0, high ?? 0) < MIN_PLAUSIBLE_SALARY) return null;
  return { min: low, max: high, currency, period };
}
