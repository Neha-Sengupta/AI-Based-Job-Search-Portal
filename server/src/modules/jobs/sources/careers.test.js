import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchJobs } from "./careers.js";

const CAREERS_FILE = "__fixtures__/careers.test.json";
const JOB_URL = "https://lexlegis.breezy.hr/p/5a2fe9a51613-legal-tech-associate";
const fixture = (file) => readFile(new URL(`./__fixtures__/${file}`, import.meta.url), "utf8");
const logger = () => ({ warn: vi.fn(), info: vi.fn(), debug: vi.fn() });

async function stubSite({ robots }) {
  const pages = {
    "https://lexlegis.breezy.hr/robots.txt": robots ?? (await fixture("careers-robots.txt")),
    "https://lexlegis.breezy.hr/": await fixture("careers-listing.html"),
    [JOB_URL]: await fixture("careers-job.html"),
  };
  const otherPage = await fixture("careers-no-json-ld.html");
  const fetchMock = vi.fn(async (url) => {
    if (url.includes("broken.example.com")) throw new TypeError("fetch failed");
    return new Response(pages[url] ?? otherPage, { headers: { "Content-Type": "text/html" } });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// The crawler waits ≥1 s between requests to a domain; fake timers keep the test fast.
async function run(promise) {
  let done = false;
  promise.finally(() => (done = true)).catch(() => {});
  while (!done) await vi.advanceTimersByTimeAsync(1000);
  return promise;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("careers fetchJobs", () => {
  it("reads JobPosting JSON-LD from job pages and skips pages without it", async () => {
    const fetchMock = await stubSite({});
    const log = logger();
    const { jobs, skipped } = await run(fetchJobs({ careersFile: CAREERS_FILE, logger: log }));

    expect(skipped).toBe(0);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      source: "careers",
      sourceId: JOB_URL,
      title: "Legal Tech Associate",
      company: "Lexlegis AI",
      location: { city: "Mumbai", country: "IN" },
      jobType: "full_time",
      applyUrl: JOB_URL,
    });
    expect(jobs[0].description).toMatch(/^Legal Tech Associate, Lexlegis\.ai\n/);
    expect(jobs[0].description).not.toMatch(/<[a-z]/);
    expect(jobs[0].postedAt).toBeInstanceOf(Date);

    // 1 robots.txt + 1 listing + 14 job links (one level deep, same domain only).
    expect(fetchMock).toHaveBeenCalledTimes(17);
    expect(
      fetchMock.mock.calls.every(([, options]) =>
        /JobSearchPortal/.test(options.headers["User-Agent"]),
      ),
    ).toBe(true);
    expect(log.debug).toHaveBeenCalledWith(
      expect.objectContaining({ source: "careers" }),
      "No JobPosting data",
    );
    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ source: "careers", origin: "https://broken.example.com" }),
      "robots.txt unreachable",
    );
  });

  it("skips pages that robots.txt disallows", async () => {
    const fetchMock = await stubSite({ robots: "User-agent: *\nDisallow: /\n" });
    const log = logger();
    const result = await run(fetchJobs({ careersFile: CAREERS_FILE, logger: log }));

    expect(result).toEqual({ jobs: [], skipped: 0 });
    expect(fetchMock.mock.calls.map(([url]) => url)).not.toContain("https://lexlegis.breezy.hr/");
    expect(log.debug).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://lexlegis.breezy.hr/" }),
      "Disallowed by robots.txt",
    );
  });

  it("waits at least 1 second between requests to the same domain", async () => {
    const fetchMock = await stubSite({});
    const times = [];
    fetchMock.mockImplementation(async (url) => {
      if (url.includes("lexlegis")) times.push(Date.now());
      if (url.includes("broken.example.com")) throw new TypeError("fetch failed");
      return new Response("<html></html>");
    });
    await run(fetchJobs({ careersFile: CAREERS_FILE, logger: logger() }));

    expect(times).toHaveLength(2);
    expect(times[1] - times[0]).toBeGreaterThanOrEqual(1000);
  });
});
