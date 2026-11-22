import { afterEach, describe, expect, it, vi } from "vitest";
import sample from "./__fixtures__/ashby.json" with { type: "json" };
import { fetchJobs } from "./ashby.js";

const COMPANIES_FILE = "__fixtures__/companies.test.json";
const logger = () => ({ warn: vi.fn(), info: vi.fn(), debug: vi.fn() });

function stubBoards(body) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) =>
      url.includes("/broken?")
        ? Promise.reject(new TypeError("fetch failed"))
        : Response.json(body),
    ),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("ashby fetchJobs", () => {
  it("normalizes India jobs, drops others and survives a failing board", async () => {
    stubBoards(sample);
    const log = logger();
    const { jobs, skipped } = await fetchJobs({ companiesFile: COMPANIES_FILE, logger: log });

    expect(skipped).toBe(0);
    expect(jobs.map((job) => job.title)).toEqual([
      "AI Native Builder/Architect",
      "Staff Software Engineer - Infrastructure",
    ]);
    expect(jobs[1]).toMatchObject({
      source: "ashby",
      company: "Atlan",
      location: { city: null, country: "IN", raw: "India" },
      workModel: "remote",
      jobType: "full_time",
      experienceLevel: "lead",
      salary: null,
    });
    expect(jobs[0].description.length).toBeGreaterThan(100);
    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ source: "ashby", company: "Broken Board" }),
      "Board fetch failed",
    );
  });

  it("maps compensation and skips a malformed job", async () => {
    const withSalary = {
      ...sample.jobs[0],
      compensation: {
        summaryComponents: [
          {
            compensationType: "Salary",
            interval: "1 YEAR",
            currencyCode: "INR",
            minValue: 3e6,
            maxValue: 5e6,
          },
        ],
      },
    };
    stubBoards({ jobs: [withSalary, { id: "bad", title: "Engineer", location: "Pune" }] });
    const log = logger();
    const { jobs, skipped } = await fetchJobs({ companiesFile: COMPANIES_FILE, logger: log });

    expect(jobs[0].salary).toEqual({ min: 3e6, max: 5e6, currency: "INR", period: "year" });
    expect(skipped).toBe(1);
    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ source: "ashby", sourceId: "bad" }),
      "Skipped invalid job",
    );
  });
});
