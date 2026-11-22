import { afterEach, describe, expect, it, vi } from "vitest";
import sample from "./__fixtures__/arbeitnow.json" with { type: "json" };
import { fetchJobs } from "./arbeitnow.js";

const logger = () => ({ warn: vi.fn(), info: vi.fn(), debug: vi.fn() });

afterEach(() => vi.unstubAllGlobals());

describe("arbeitnow fetchJobs", () => {
  it("keeps remote jobs (dev-only rule) and drops on-site European jobs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(sample)),
    );
    const { jobs, skipped } = await fetchJobs({ logger: logger() });

    expect(skipped).toBe(0);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      source: "arbeitnow",
      sourceId: sample.data[0].slug,
      workModel: "remote",
      applyUrl: sample.data[0].url,
    });
    expect(jobs[0].postedAt).toEqual(new Date(sample.data[0].created_at * 1000));
  });

  it("skips and logs a malformed job", async () => {
    const bad = { slug: "bad", title: "Engineer", remote: true, created_at: 1 };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ ...sample, data: [bad, sample.data[0]] })),
    );
    const log = logger();
    const { jobs, skipped } = await fetchJobs({ logger: log });

    expect(jobs).toHaveLength(1);
    expect(skipped).toBe(1);
    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ source: "arbeitnow", sourceId: "bad" }),
      "Skipped invalid job",
    );
  });

  it("logs a failed page and returns what it has", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("down", { status: 503 })),
    );
    const log = logger();
    expect(await fetchJobs({ logger: log })).toEqual({ jobs: [], skipped: 0 });
    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1 }),
      "Page fetch failed",
    );
  });
});
