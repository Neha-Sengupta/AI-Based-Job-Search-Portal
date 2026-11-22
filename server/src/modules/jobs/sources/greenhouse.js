// Greenhouse job board API: public, no key, meant for job boards; one call per company
//. `content` is HTML-escaped HTML.
import { fetchBoards, fetchJson, inferExperienceLevel, inferJobType } from "./adapter-utils.js";
import { htmlToText } from "./html-to-text.js";
import { detectWorkModel, isOpenToIndia, parseLocation } from "./location.js";

export const name = "greenhouse";

const boardUrl = (token) =>
  `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`;

function mapJob(item, company) {
  const location = parseLocation(item.location?.name);
  const job = {
    source: name,
    sourceId: String(item.id),
    title: item.title,
    company: company.company,
    location,
    workModel: detectWorkModel(item.location?.name),
    jobType: inferJobType(null, item.title),
    experienceLevel: inferExperienceLevel(item.title),
    salary: null,
    description: htmlToText(item.content),
    applyUrl: item.absolute_url,
    postedAt: item.first_published ?? item.updated_at,
  };
  return isOpenToIndia(job, { indianCompany: company.indian }) ? job : null;
}

export async function fetchJobs({ maxJobs = 0, companiesFile = "companies.json", logger }) {
  return fetchBoards({
    source: name,
    companiesFile,
    maxJobs,
    logger,
    async fetchBoard(company, collector) {
      const { jobs = [] } = await fetchJson(boardUrl(company.token));
      for (const item of jobs) collector.add(item?.id, () => mapJob(item, company));
    },
  });
}
