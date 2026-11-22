// Arbeitnow job board API: free, no key, paginated, refreshed hourly. Terms: "free public API,
// please do not abuse; linking back is appreciated". Mostly European jobs, so it is a
// development-only practice source.
import {
  createCollector,
  fetchJson,
  inferExperienceLevel,
  inferJobType,
  wait,
} from "./adapter-utils.js";
import { htmlToText } from "./html-to-text.js";
import { detectWorkModel, isOpenToIndia, parseLocation } from "./location.js";

export const name = "arbeitnow";

const FIRST_PAGE_URL = "https://www.arbeitnow.com/api/job-board-api";
const MAX_PAGES = 5;
const PAGE_DELAY_MS = 1000;

function mapJob(item) {
  const location = parseLocation(item.location);
  const job = {
    source: name,
    sourceId: item.slug,
    title: item.title,
    company: item.company_name,
    location,
    workModel: item.remote ? "remote" : detectWorkModel(item.location),
    jobType: inferJobType(item.job_types, item.title),
    experienceLevel: inferExperienceLevel(item.title),
    salary: null,
    description: htmlToText(item.description),
    applyUrl: item.url,
    postedAt: new Date(item.created_at * 1000),
  };
  // Dev-only exception to the India filter: every remote job is kept so development has data.
  return job.workModel === "remote" || isOpenToIndia(job) ? job : null;
}

export async function fetchJobs({ maxJobs = 0, logger }) {
  const collector = createCollector({ source: name, maxJobs, logger });
  let url = FIRST_PAGE_URL;
  for (let page = 1; url && page <= MAX_PAGES && !collector.isFull(); page += 1) {
    if (page > 1) await wait(PAGE_DELAY_MS);
    try {
      const { data = [], links } = await fetchJson(url);
      for (const item of data) collector.add(item?.slug, () => mapJob(item));
      url = links?.next;
    } catch (error) {
      logger.warn({ source: name, page, reason: error.message }, "Page fetch failed");
      break;
    }
  }
  return collector.result();
}
