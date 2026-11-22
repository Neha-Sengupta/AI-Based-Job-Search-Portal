import { useTestDatabase } from "../../test/db.js";
import request from "supertest";
import { describe, expect, it, beforeAll } from "vitest";
import { createApp } from "../../app.js";
import { signUp } from "../../test/auth.js";
import { createJob, createProfile } from "../../test/fixtures.js";
import { Job } from "./model.js";

useTestDatabase();
const app = createApp();

describe("jobs API (F4, F5, F6)", () => {
  beforeAll(async () => {
    await Job.syncIndexes(); // the text index is needed for q=
    await createJob({ title: "React Developer", company: "Acme", workModel: "remote" });
    await createJob({
      title: "Data Analyst",
      company: "Numbers",
      description: "SQL, Excel and Power BI. 1 year of experience.",
      location: { city: "Mumbai", country: "IN", raw: "Mumbai" },
      workModel: "onsite",
    });
    await createJob({
      title: "Backend Engineer",
      company: "Berlin GmbH",
      description: "Node.js, PostgreSQL and React dashboards.",
      location: { city: "Berlin", country: "DE", raw: "Berlin" },
      workModel: "remote",
      postedAt: new Date(Date.now() - 10 * 86_400_000),
    });
    await createJob({
      title: "Ops Associate",
      company: "Pending",
      description: "Help our team.",
      requirements: null,
    });
  });

  it("lists newest jobs for a visitor without fit badges (F4.1)", async () => {
    const res = await request(app).get("/api/v1/jobs");
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 20, total: 4 });
    expect(res.body.data[0]).not.toHaveProperty("fit");
    expect(res.body.data.at(-1).company).toBe("Berlin GmbH");
  });

  it("searches by keyword, title matches first (F4.2)", async () => {
    const res = await request(app).get("/api/v1/jobs?q=react");
    expect(res.body.data.map((job) => job.title)).toEqual(["React Developer", "Backend Engineer"]);
  });

  it("filters by work model and country (F4.3)", async () => {
    const res = await request(app).get("/api/v1/jobs?workModel=remote&country=IN");
    expect(res.body.data.map((job) => job.title)).toEqual(["React Developer"]);
  });

  it("filters by posted date", async () => {
    const res = await request(app).get("/api/v1/jobs?postedWithin=7");
    expect(res.body.data.some((job) => job.company === "Berlin GmbH")).toBe(false);
  });

  it("rejects limit=500 and a long q (F4.6, F4.7)", async () => {
    expect((await request(app).get("/api/v1/jobs?limit=500")).status).toBe(400);
    expect((await request(app).get(`/api/v1/jobs?q=${"a".repeat(101)}`)).status).toBe(400);
  });

  it("adds fit scores for a signed-in user with a profile", async () => {
    const { cookie } = await signUp(app);
    await createProfile(app, cookie);
    const res = await request(app).get("/api/v1/jobs").set("Cookie", cookie);
    const react = res.body.data.find((job) => job.title === "React Developer");
    expect(react.fit).toMatchObject({ verdict: expect.any(String), score: expect.any(Number) });
    expect(res.body.data.find((job) => job.title === "Ops Associate").fit).toEqual({
      status: "requirements_pending",
    });
  });

  it("returns the job detail with plain-text description and fit breakdown (F5.1, F6)", async () => {
    const { cookie } = await signUp(app);
    await createProfile(app, cookie);
    const job = await Job.findOne({ title: "React Developer" }).lean();
    const res = await request(app).get(`/api/v1/jobs/${job._id}`).set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      title: "React Developer",
      applyUrl: "https://example.com/apply",
      application: null,
    });
    expect(Object.keys(res.body.data.fit.breakdown)).toEqual([
      "mustHave",
      "experience",
      "niceToHave",
      "education",
      "location",
    ]);
  });

  it("is 404 for a missing job and 400 for a bad id (F5.4, F5.5)", async () => {
    expect((await request(app).get("/api/v1/jobs/65f1c2a9b4e8d7f6a5b4c3d2")).status).toBe(404);
    expect((await request(app).get("/api/v1/jobs/abc")).status).toBe(400);
  });

  it("recommends jobs matching preferences, best fit first (F6.11)", async () => {
    const { cookie } = await signUp(app);
    await createProfile(app, cookie);
    const res = await request(app).get("/api/v1/jobs/recommended").set("Cookie", cookie);
    expect(res.status).toBe(200);
    const scores = res.body.data.map((job) => job.fit?.score ?? -1);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(res.body.data.some((job) => job.title === "Data Analyst")).toBe(false); // onsite isn't in preferences
  });

  it("needs a session and a profile for recommendations", async () => {
    expect((await request(app).get("/api/v1/jobs/recommended")).status).toBe(401);
    const { cookie } = await signUp(app);
    expect((await request(app).get("/api/v1/jobs/recommended").set("Cookie", cookie)).status).toBe(
      404,
    );
  });
});
