import { describe, expect, it, vi } from "vitest";
import { fetchJobs } from "./fixtures.js";

const logger = () => ({ warn: vi.fn(), info: vi.fn(), debug: vi.fn() });

describe("fixtures fetchJobs", () => {
  it("returns the saved India jobs, all valid, with the newest dated now", async () => {
    const log = logger();
    const { jobs, skipped } = await fetchJobs({ logger: log });

    expect(jobs.length).toBeGreaterThanOrEqual(150);
    expect(skipped).toBe(0);
    expect(jobs.every((job) => job.location.country === "IN" || job.workModel === "remote")).toBe(
      true,
    );
    const newest = Math.max(...jobs.map((job) => job.postedAt.getTime()));
    expect(Date.now() - newest).toBeLessThan(60_000);
  });

  it("respects maxJobs", async () => {
    const { jobs } = await fetchJobs({ maxJobs: 5, logger: logger() });
    expect(jobs).toHaveLength(5);
  });
});
