import { useTestDatabase } from "../../test/db.js";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fakeJobs = { jobs: [], skipped: 0 };
vi.mock("./sources/index.js", () => ({
  SOURCES: {
    fake: { name: "fake", fetchJobs: vi.fn(async () => fakeJobs) },
    other: { name: "other", fetchJobs: vi.fn(async () => ({ jobs: [], skipped: 0 })) },
  },
}));

const { createApp } = await import("../../app.js");
const { runImport } = await import("./import.js");
const { Job } = await import("./model.js");
const { Application } = await import("../applications/model.js");
const { SOURCES } = await import("./sources/index.js");

useTestDatabase();
const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

const job = (id, overrides = {}) => ({
  source: "fake",
  sourceId: id,
  title: `Engineer ${id}`,
  company: "Acme",
  location: { city: "Pune", country: "IN", raw: "Pune" },
  workModel: "hybrid",
  jobType: "full_time",
  experienceLevel: "mid",
  salary: null,
  description: "3+ years of React and Node.js.",
  applyUrl: "https://example.com",
  postedAt: new Date(),
  ...overrides,
});

describe("runImport (F4.8–F4.12)", () => {
  beforeEach(async () => {
    await Job.deleteMany({});
    fakeJobs.jobs = [job("a"), job("b")];
    fakeJobs.skipped = 1;
  });

  it("imports jobs with rule-extracted requirements", async () => {
    const counts = await runImport({ sources: ["fake"], logger });
    expect(counts).toMatchObject({ fetched: 2, created: 2, skippedInvalid: 1 });
    const saved = await Job.findOne({ sourceId: "a" }).lean();
    expect(saved.requirements).toMatchObject({ mustHave: ["React", "Node.js"], minYears: 3 });
  });

  it("creates nothing new on a second run with the same data (F4.8)", async () => {
    await runImport({ sources: ["fake"], logger });
    const second = await runImport({ sources: ["fake"], logger });
    expect(second).toMatchObject({ created: 0, skippedDuplicate: 2 });
  });

  it("keeps one copy of the same job from two sources (F4.9)", async () => {
    fakeJobs.jobs = [job("a"), job("a2", { source: "other-board", title: "Engineer a" })];
    const counts = await runImport({ sources: ["fake"], logger });
    expect(counts).toMatchObject({ created: 1, skippedDuplicate: 1 });
  });

  it("purges jobs older than 60 days; applications keep their snapshot (F4.10)", async () => {
    fakeJobs.jobs = [job("old", { postedAt: new Date(Date.now() - 61 * 86_400_000) })];
    await runImport({ sources: ["fake"], logger, now: new Date(Date.now() - 2 * 86_400_000) });
    const old = await Job.findOne({ sourceId: "old" }).lean();
    await Application.create({
      userId: old._id,
      jobId: old._id,
      job: { title: old.title, company: old.company },
    });
    fakeJobs.jobs = [];
    const counts = await runImport({ sources: ["fake"], logger });
    expect(counts.purged).toBe(1);
    expect(await Job.exists({ sourceId: "old" })).toBeNull();
    expect((await Application.findOne({ jobId: old._id }).lean()).job.title).toBe("Engineer old");
  });

  it("keeps going when one source fails (F4.12)", async () => {
    SOURCES.other.fetchJobs.mockRejectedValueOnce(new Error("board down"));
    const counts = await runImport({ sources: ["other", "fake"], logger });
    expect(counts.created).toBe(2);
    expect(logger.error).toHaveBeenCalled();
  });

  it("is protected by the internal key (F4.11)", async () => {
    const app = createApp();
    expect((await request(app).post("/internal/jobs/import")).status).toBe(403);
    expect(
      (await request(app).post("/internal/jobs/import").set("X-Internal-Key", "wrong")).status,
    ).toBe(403);
    const ok = await request(app)
      .post("/internal/jobs/import")
      .set("X-Internal-Key", process.env.INTERNAL_API_KEY);
    expect(ok.status).toBe(200);
    expect(ok.body.data).toHaveProperty("created");
  });
});
