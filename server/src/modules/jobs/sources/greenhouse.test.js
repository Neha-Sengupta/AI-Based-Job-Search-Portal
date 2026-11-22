import { afterEach, describe, expect, it, vi } from "vitest";
import sample from "./__fixtures__/greenhouse.json" with { type: "json" };
import { fetchJobs } from "./greenhouse.js";

const COMPANIES_FILE = "__fixtures__/companies.test.json";
const logger = () => ({ warn: vi.fn(), info: vi.fn(), debug: vi.fn() });

function stubBoards(body) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) =>
      url.includes("/broken/") ? new Response("oops", { status: 500 }) : Response.json(body),
    ),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("greenhouse fetchJobs", () => {
  it("normalizes India jobs, drops others and survives a failing board", async () => {
    stubBoards(sample);
    const log = logger();
    const { jobs, skipped } = await fetchJobs({ companiesFile: COMPANIES_FILE, logger: log });

    expect(skipped).toBe(0);
    expect(jobs.map((job) => job.sourceId)).toEqual(["4970739101", "4528370101"]);
    expect(jobs[0]).toMatchObject({
      source: "greenhouse",
      title: "Assistant Manager - Internal Audit",
      company: "Groww",
      location: { city: "Bengaluru", country: "IN", raw: "Bengaluru-VTP, India" },
      workModel: "unknown",
      jobType: "unknown",
      applyUrl: "https://job-boards.eu.greenhouse.io/groww/jobs/4970739101",
    });
    expect(jobs[0].description).toMatch(/^About Groww:\nWe are a passionate group/);
    expect(jobs[0].description).not.toMatch(/<|&lt;|&amp;/);
    expect(jobs[0].postedAt).toBeInstanceOf(Date);
    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ source: "greenhouse", company: "Broken Board" }),
      "Board fetch failed",
    );
  });

  it("skips and logs a malformed job without failing the fetch", async () => {
    stubBoards({ jobs: [{ id: 1, title: "", location: { name: "Pune" } }, sample.jobs[0]] });
    const log = logger();
    const { jobs, skipped } = await fetchJobs({ companiesFile: COMPANIES_FILE, logger: log });

    expect(jobs).toHaveLength(1);
    expect(skipped).toBe(1);
    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ source: "greenhouse", sourceId: 1, reason: expect.any(String) }),
      "Skipped invalid job",
    );
  });

  it("stops at maxJobs", async () => {
    stubBoards(sample);
    const { jobs } = await fetchJobs({
      maxJobs: 1,
      companiesFile: COMPANIES_FILE,
      logger: logger(),
    });
    expect(jobs).toHaveLength(1);
  });
});
