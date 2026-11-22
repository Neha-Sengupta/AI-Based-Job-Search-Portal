// Lever postings API: public, no key, meant for job boards; one call per company
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

export const name = "lever";

const WORKPLACE_TYPES = { remote: "remote", hybrid: "hybrid", onsite: "onsite" };

const boardUrl = (site) => `https://api.lever.co/v0/postings/${encodeURIComponent(site)}?mode=json`;

// Lever splits the description into an intro, titled lists (HTML <li> items) and a closing part.
const descriptionHtml = (item) =>
  [
    item.description,
    ...(item.lists ?? []).map((list) => `<h3>${list.text}</h3><ul>${list.content}</ul>`),
    item.additional,
  ].join("\n");

function mapLocation(item) {
  const { categories = {} } = item;
  const location = parseLocation((categories.allLocations ?? [categories.location]).join("; "));
  if (/^[A-Z]{2}$/.test(item.country ?? "") && item.country !== location.country) {
    return { ...location, country: item.country, city: null };
  }
  return location;
}

function mapJob(item, company) {
  const location = mapLocation(item);
  const job = {
    source: name,
    sourceId: item.id,
    title: item.text,
    company: company.company,
    location,
    workModel: WORKPLACE_TYPES[item.workplaceType] ?? detectWorkModel(location.raw),
    jobType: inferJobType(item.categories?.commitment, item.text),
    experienceLevel: inferExperienceLevel(item.text),
    salary: item.salaryRange ? toSalary(item.salaryRange) : null,
    description: htmlToText(descriptionHtml(item)),
    applyUrl: item.hostedUrl,
    postedAt: item.createdAt,
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
      const items = await fetchJson(boardUrl(company.token));
      if (!Array.isArray(items)) throw new Error("Unexpected response shape");
      for (const item of items) collector.add(item?.id, () => mapJob(item, company));
    },
  });
}
