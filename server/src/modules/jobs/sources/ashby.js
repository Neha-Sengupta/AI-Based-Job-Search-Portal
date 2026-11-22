// Ashby posting API: public, no key, meant for job boards; one call per company
//.
import {
  fetchBoards,
  fetchJson,
  inferExperienceLevel,
  inferJobType,
  toSalary,
} from "./adapter-utils.js";
import { htmlToText } from "./html-to-text.js";
import { detectWorkModel, isOpenToIndia, parseLocation } from "./location.js";

export const name = "ashby";

const WORKPLACE_TYPES = { Remote: "remote", Hybrid: "hybrid", OnSite: "onsite" };

const boardUrl = (board) =>
  `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}?includeCompensation=true`;

function mapSalary(compensation) {
  const component = compensation?.summaryComponents?.find(
    (part) => part.compensationType === "Salary",
  );
  if (!component) return null;
  return toSalary({
    min: component.minValue,
    max: component.maxValue,
    currency: component.currencyCode,
    interval: component.interval,
  });
}

function mapWorkModel(item, location) {
  if (WORKPLACE_TYPES[item.workplaceType]) return WORKPLACE_TYPES[item.workplaceType];
  return item.isRemote ? "remote" : detectWorkModel(location.raw);
}

function mapJob(item, company) {
  const places = [item.location, ...(item.secondaryLocations ?? []).map((place) => place.location)];
  const location = parseLocation(places.filter(Boolean).join("; "));
  const job = {
    source: name,
    sourceId: item.id,
    title: item.title,
    company: company.company,
    location,
    workModel: mapWorkModel(item, location),
    jobType: inferJobType(item.employmentType?.replace(/([a-z])([A-Z])/g, "$1 $2"), item.title),
    experienceLevel: inferExperienceLevel(item.title),
    salary: mapSalary(item.compensation),
    description: htmlToText(item.descriptionHtml),
    applyUrl: item.jobUrl,
    postedAt: item.publishedAt,
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
      for (const item of jobs) {
        if (item?.isListed !== false) collector.add(item?.id, () => mapJob(item, company));
      }
    },
  });
}
