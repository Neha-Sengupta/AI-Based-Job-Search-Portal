import { afterEach, describe, expect, it, vi } from "vitest";
import sample from "./__fixtures__/lever.json" with { type: "json" };
import { fetchJobs } from "./lever.js";

const COMPANIES_FILE = "__fixtures__/companies.test.json";
const logger = () => ({ warn: vi.fn(), info: vi.fn(), debug: vi.fn() });

function stubBoards(body) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) =>
      url.includes("/broken?") ? new Response("oops", { status: 404 }) : Response.json(body),
    ),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("lever fetchJobs", () => {
  it("normalizes India jobs, drops others and survives a failing board", async () => {
    stubBoards(sample);
    const log = logger();
    const { jobs, skipped } = await fetchJobs({ companiesFile: COMPANIES_FILE, logger: log });

    expect(skipped).toBe(0);
    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toMatchObject({
      source: "lever",
      sourceId: "aa98a938-af3a-45f5-851d-966b2b5bad33",
      title: "accounts payable manager",
      company: "CRED",
      location: { city: "Hyderabad", country: "IN", raw: "hyderabad" },
      workModel: "onsite",
      jobType: "full_time",
      experienceLevel: "unknown",
      salary: null,
      applyUrl: "https://jobs.lever.co/cred/aa98a938-af3a-45f5-851d-966b2b5bad33",
    });
    expect(jobs[1].location).toEqual({ city: null, country: "IN", raw: "tamil nadu" });
    expect(jobs[0].description).toMatch(/\n• /);
    expect(jobs[0].description).not.toMatch(/<[a-z]/);
    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ source: "lever", company: "Broken Board" }),
      "Board fetch failed",
    );
  });

  it("maps salary ranges and skips a malformed job", async () => {
    const withSalary = {
      ...sample[0],
      salaryRange: { min: 1_500_000, max: 2_500_000, currency: "INR", interval: "per-year-salary" },
    };
    stubBoards([withSalary, { id: "bad", text: "No URL", country: "IN" }]);
    const log = logger();
    const { jobs, skipped } = await fetchJobs({ companiesFile: COMPANIES_FILE, logger: log });

    expect(jobs[0].salary).toEqual({
      min: 1_500_000,
      max: 2_500_000,
      currency: "INR",
      period: "year",
    });
    expect(skipped).toBe(1);
    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ source: "lever", sourceId: "bad" }),
      "Skipped invalid job",
    );
  });
});
