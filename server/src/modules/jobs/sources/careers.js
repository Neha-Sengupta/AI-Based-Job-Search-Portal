// Careers-page crawler: reads schema.org JobPosting data from the
// careers pages of companies listed in careers.json. Polite by design: robots.txt is obeyed,
// one request per second per domain, a User-Agent naming the project, 10 s timeout, 2 MB cap.
import { parse } from "node-html-parser";
import robotsParser from "robots-parser";
import {
  FETCH_TIMEOUT_MS,
  USER_AGENT,
  createCollector,
  inferExperienceLevel,
  inferJobType,
  readSourceJson,
  toSalary,
  wait,
} from "./adapter-utils.js";
import { htmlToText } from "./html-to-text.js";
import { detectWorkModel, isOpenToIndia, parseLocation } from "./location.js";

export const name = "careers";

export const CRAWL_MAX_PAGES_PER_COMPANY = 50;
const MIN_DOMAIN_DELAY_MS = 1000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const JOB_LINK_PATTERN = /job|career|position|opening|vacanc|role/i;

// Fetches pages politely: robots.txt (cached per origin) and a minimum gap per domain.
function createPoliteFetcher(logger) {
  const robotsByOrigin = new Map();
  const lastRequestAt = new Map();

  async function fetchText(url, crawlDelayMs = MIN_DOMAIN_DELAY_MS) {
    const { host } = new URL(url);
    const waitMs = (lastRequestAt.get(host) ?? 0) + crawlDelayMs - Date.now();
    if (waitMs > 0) await wait(waitMs);
    lastRequestAt.set(host, Date.now());
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,text/plain" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    return { status: response.status, text: response.ok ? await readCapped(response) : "" };
  }

  // Missing robots.txt (4xx) allows everything; an unreachable one (5xx, network) allows nothing.
  async function robotsFor(url) {
    const { origin } = new URL(url);
    if (!robotsByOrigin.has(origin)) {
      const robotsUrl = `${origin}/robots.txt`;
      let robots;
      try {
        const { status, text } = await fetchText(robotsUrl);
        robots = status >= 500 ? null : robotsParser(robotsUrl, status < 400 ? text : "");
      } catch (error) {
        logger.warn({ source: name, origin, reason: error.message }, "robots.txt unreachable");
        robots = null;
      }
      robotsByOrigin.set(origin, robots);
    }
    return robotsByOrigin.get(origin);
  }

  // Returns the page HTML, or null when robots.txt disallows the URL or the page is not OK.
  return async function fetchPage(url) {
    const robots = await robotsFor(url);
    if (robots?.isAllowed(url, USER_AGENT) !== true) {
      logger.debug({ source: name, url }, "Disallowed by robots.txt");
      return null;
    }
    const crawlDelayMs = Math.max(
      MIN_DOMAIN_DELAY_MS,
      (robots.getCrawlDelay(USER_AGENT) ?? 0) * 1000,
    );
    const { status, text } = await fetchText(url, crawlDelayMs);
    if (status >= 400) throw new Error(`HTTP ${status}`);
    return text;
  };
}

// Stops reading after MAX_RESPONSE_BYTES; JSON-LD sits near the top of a page anyway.
async function readCapped(response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    text += decoder.decode(value, { stream: true });
    if (bytes >= MAX_RESPONSE_BYTES) {
      await reader.cancel();
      break;
    }
  }
  return text + decoder.decode();
}

const withoutHash = (url) => {
  const copy = new URL(url);
  copy.hash = "";
  return copy.href;
};

// A job page link: same domain, and either below the listing path (/careers → /careers/123)
// or with a job-like word in its path.
function looksLikeJobPage(url, listing) {
  if (url.host !== listing.host || !/^https?:$/.test(url.protocol)) return false;
  const listingPath = listing.pathname.endsWith("/") ? listing.pathname : `${listing.pathname}/`;
  return url.pathname.startsWith(listingPath) || JOB_LINK_PATTERN.test(url.pathname);
}

// Job page links from the listing page (one level deep only).
function findJobLinks(root, listingUrl) {
  const listing = new URL(listingUrl);
  const links = new Set();
  for (const anchor of root.querySelectorAll("a[href]")) {
    const href = anchor.getAttribute("href");
    if (!URL.canParse(href, listingUrl)) continue;
    const url = new URL(href, listingUrl);
    if (looksLikeJobPage(url, listing)) links.add(withoutHash(url));
  }
  links.delete(withoutHash(listingUrl));
  return [...links].slice(0, CRAWL_MAX_PAGES_PER_COMPANY - 1);
}

const isJobPosting = (node) => [node?.["@type"]].flat().includes("JobPosting");

// JSON-LD blocks may hold one object, an array, or a { "@graph": [...] } wrapper.
function extractJobPostings(root, logger, url) {
  const postings = [];
  for (const script of root.querySelectorAll('script[type="application/ld+json"]')) {
    let data;
    try {
      data = JSON.parse(script.rawText);
    } catch {
      logger.debug({ source: name, url }, "Invalid JSON-LD block ignored");
      continue;
    }
    for (const node of [data].flat().flatMap((item) => [item, ...(item?.["@graph"] ?? [])])) {
      if (isJobPosting(node)) postings.push(node);
    }
  }
  return postings;
}

const textOf = (value) => (typeof value === "string" ? value : (value?.name ?? ""));

function placeText(place) {
  const address = place?.address ?? {};
  if (typeof address === "string") return address;
  return [address.addressLocality, address.addressRegion, textOf(address.addressCountry)]
    .filter(Boolean)
    .join(", ");
}

function mapLocation(posting) {
  const places = [posting.jobLocation ?? []].flat();
  const requirements = [posting.applicantLocationRequirements ?? []].flat().map(textOf);
  const location = parseLocation([...places.map(placeText), ...requirements].join("; "));
  if (location.country) return location;
  // addressCountry is often an ISO code ("IN"), which free-text parsing deliberately ignores.
  const codes = places
    .map((place) => textOf(place?.address?.addressCountry))
    .filter((code) => /^[A-Z]{2}$/.test(code));
  if (codes.length === 0) return location;
  return { ...location, country: codes.includes("IN") ? "IN" : codes[0] };
}

function mapSalary(baseSalary) {
  const value = baseSalary?.value ?? {};
  const amount = typeof value === "number" ? value : value.value;
  return toSalary({
    min: value.minValue ?? amount,
    max: value.maxValue ?? amount,
    currency: baseSalary?.currency,
    interval: value.unitText,
  });
}

function mapPosting(posting, { company, pageUrl, sourceId }) {
  const location = mapLocation(posting);
  const title = htmlToText(posting.title);
  const job = {
    source: name,
    sourceId,
    title,
    company: textOf(posting.hiringOrganization) || company,
    location,
    workModel:
      posting.jobLocationType === "TELECOMMUTE"
        ? "remote"
        : detectWorkModel(`${location.raw} ${title}`),
    jobType: inferJobType(posting.employmentType, title),
    experienceLevel: inferExperienceLevel(title),
    salary: posting.baseSalary ? mapSalary(posting.baseSalary) : null,
    description: htmlToText(posting.description),
    applyUrl: pageUrl,
    postedAt: posting.datePosted,
  };
  return isOpenToIndia(job) ? job : null;
}

function canonicalUrl(root, pageUrl) {
  const href = root.querySelector('link[rel="canonical"]')?.getAttribute("href");
  if (!href || !URL.canParse(href, pageUrl)) return withoutHash(pageUrl);
  const canonical = new URL(href, pageUrl);
  return canonical.host === new URL(pageUrl).host ? withoutHash(canonical) : withoutHash(pageUrl);
}

function addPostings({ html, pageUrl, company, collector, logger }) {
  const root = parse(html);
  const postings = extractJobPostings(root, logger, pageUrl);
  if (postings.length === 0) logger.debug({ source: name, url: pageUrl }, "No JobPosting data");
  const canonical = canonicalUrl(root, pageUrl);
  postings.forEach((posting, index) => {
    const sourceId = postings.length === 1 ? canonical : `${canonical}#${index + 1}`;
    collector.add(sourceId, () => mapPosting(posting, { company, pageUrl, sourceId }));
  });
  return root;
}

async function crawlCompany({ company, url }, { fetchPage, collector, logger }) {
  const listingHtml = await fetchPage(url);
  if (listingHtml === null) return;
  const root = addPostings({ html: listingHtml, pageUrl: url, company, collector, logger });
  for (const pageUrl of findJobLinks(root, url)) {
    if (collector.isFull()) return;
    try {
      const html = await fetchPage(pageUrl);
      if (html !== null) addPostings({ html, pageUrl, company, collector, logger });
    } catch (error) {
      logger.warn({ source: name, url: pageUrl, reason: error.message }, "Job page failed");
    }
  }
}

export async function fetchJobs({ maxJobs = 0, careersFile = "careers.json", logger }) {
  const sites = await readSourceJson(careersFile);
  const collector = createCollector({ source: name, maxJobs, logger });
  const fetchPage = createPoliteFetcher(logger);
  for (const site of sites) {
    if (collector.isFull()) break;
    try {
      await crawlCompany(site, { fetchPage, collector, logger });
    } catch (error) {
      logger.warn(
        { source: name, company: site.company, reason: error.message },
        "Careers site failed",
      );
    }
  }
  return collector.result();
}
