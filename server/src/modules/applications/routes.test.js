import { useTestDatabase } from "../../test/db.js";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../app.js";
import { signUp } from "../../test/auth.js";
import { createJob, createProfile } from "../../test/fixtures.js";
import { Job } from "../jobs/model.js";
import { env } from "../../config/env.js";
import { outputExample } from "../../prompts/application-answers.js";

useTestDatabase();
const app = createApp();

async function setup() {
  const { cookie } = await signUp(app);
  await createProfile(app, cookie);
  const job = await createJob();
  const saved = await request(app)
    .post("/api/v1/applications")
    .set("Cookie", cookie)
    .send({ jobId: String(job._id) });
  return { cookie, job, application: saved.body.data };
}

describe("applications API (F8)", () => {
  it("saves a job to the tracker with a snapshot (F8.1)", async () => {
    const { cookie, application } = await setup();
    expect(application).toMatchObject({ status: "saved", job: { title: "Frontend Developer" } });
    const list = await request(app).get("/api/v1/applications").set("Cookie", cookie);
    expect(list.body.data.map((item) => item.id)).toEqual([application.id]);
  });

  it("returns 409 with the existing id when saved twice (F8.2)", async () => {
    const { cookie, job, application } = await setup();
    const again = await request(app)
      .post("/api/v1/applications")
      .set("Cookie", cookie)
      .send({ jobId: String(job._id) });
    expect(again.status).toBe(409);
    expect(again.body.error.details).toEqual({ applicationId: application.id });
  });

  it("records every status change, including going backwards (F8.3, F8.4)", async () => {
    const { cookie, application } = await setup();
    for (const status of ["applied", "interview", "applied"]) {
      await request(app)
        .patch(`/api/v1/applications/${application.id}`)
        .set("Cookie", cookie)
        .send({ status });
    }
    const res = await request(app)
      .get(`/api/v1/applications/${application.id}`)
      .set("Cookie", cookie);
    expect(res.body.data.history.map((item) => item.status)).toEqual([
      "saved",
      "applied",
      "interview",
      "applied",
    ]);
  });

  it("keeps the snapshot after the job is purged (F8.5)", async () => {
    const { cookie, job } = await setup();
    await Job.deleteOne({ _id: job._id });
    const list = await request(app).get("/api/v1/applications").set("Cookie", cookie);
    expect(list.body.data[0]).toMatchObject({
      jobAvailable: false,
      job: { title: "Frontend Developer" },
    });
  });

  it("filters by status", async () => {
    const { cookie, application } = await setup();
    await request(app)
      .patch(`/api/v1/applications/${application.id}`)
      .set("Cookie", cookie)
      .send({ status: "offer" });
    expect(
      (await request(app).get("/api/v1/applications?status=saved").set("Cookie", cookie)).body.data,
    ).toEqual([]);
    expect(
      (await request(app).get("/api/v1/applications?status=offer").set("Cookie", cookie)).body.data,
    ).toHaveLength(1);
  });

  it("hides another user's application (F8.7)", async () => {
    const a = await setup();
    const b = await setup();
    const path = `/api/v1/applications/${a.application.id}`;
    expect(
      (await request(app).patch(path).set("Cookie", b.cookie).send({ status: "offer" })).status,
    ).toBe(404);
    expect((await request(app).delete(path).set("Cookie", b.cookie)).status).toBe(404);
    expect((await request(app).get(path).set("Cookie", b.cookie)).status).toBe(404);
  });

  it("validates input and requires a session", async () => {
    const { cookie } = await setup();
    expect(
      (
        await request(app)
          .post("/api/v1/applications")
          .set("Cookie", cookie)
          .send({ jobId: "nope" })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post("/api/v1/applications")
          .set("Cookie", cookie)
          .send({ jobId: "65f1c2a9b4e8d7f6a5b4c3d2" })
      ).status,
    ).toBe(404);
    expect((await request(app).get("/api/v1/applications")).status).toBe(401);
  });

  it("shows the application on the job detail", async () => {
    const { cookie, job, application } = await setup();
    const detail = await request(app).get(`/api/v1/jobs/${job._id}`).set("Cookie", cookie);
    expect(detail.body.data.application).toEqual({
      id: application.id,
      status: "saved",
      cvId: null,
    });
  });
});

describe("application kit answers (F10)", () => {
  const modelAnswer = (questions) => ({
    choices: [
      {
        message: {
          content: JSON.stringify({
            answers: questions.map((question) => ({
              question,
              answer: `I built React pages at Acme. (${question.length})`,
            })),
          }),
        },
      },
    ],
    usage: { prompt_tokens: 10, completion_tokens: 10 },
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    env.AI_BASE_URL = "";
    env.AI_MODEL = "";
  });

  function enableFakeAi(respond) {
    env.AI_BASE_URL = "http://ai.test/v1";
    env.AI_MODEL = "test-model";
    const fetchMock = vi.fn(async (_url, init) => {
      const body = JSON.parse(init.body);
      const questions = [...body.messages[1].content.matchAll(/^\d+\. (.+)$/gm)].map(
        (match) => match[1],
      );
      return { ok: true, json: async () => respond(questions) };
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("says AI isn't available when it isn't configured", async () => {
    const { cookie, application } = await setup();
    const res = await request(app)
      .post(`/api/v1/applications/${application.id}/answers`)
      .set("Cookie", cookie)
      .send({});
    expect(res.status).toBe(502);
    expect(res.body.error).toMatchObject({
      code: "AI_FAILED",
      message: "AI drafting isn't available right now.",
    });
  });

  it("drafts the 4 default answers once, then reuses them without an AI call (F10.3, F10.4)", async () => {
    const fetchMock = enableFakeAi(modelAnswer);
    const { cookie, application } = await setup();
    const path = `/api/v1/applications/${application.id}/answers`;
    const first = await request(app).post(path).set("Cookie", cookie).send({});
    expect(first.status).toBe(200);
    expect(first.body.data.answers).toHaveLength(4);
    const second = await request(app).post(path).set("Cookie", cookie).send({});
    expect(second.body.data.answers).toEqual(first.body.data.answers);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // The model sees a filled-in example, never a JSON Schema (8B models echo a schema back).
    const userMessage = JSON.parse(fetchMock.mock.calls[0][1].body).messages[1].content;
    expect(userMessage).toContain(JSON.stringify(outputExample));
    expect(userMessage).not.toContain("$schema");
  });

  it("adds custom answers and refuses more than 20 (F10.5, F10.9)", async () => {
    enableFakeAi(modelAnswer);
    const { cookie, application } = await setup();
    const path = `/api/v1/applications/${application.id}/answers`;
    const custom = await request(app)
      .post(path)
      .set("Cookie", cookie)
      .send({ questions: ["What is your notice period?"] });
    expect(custom.body.data.answers.map((item) => item.question)).toEqual([
      "What is your notice period?",
    ]);
    const many = Array.from({ length: 20 }, (_, index) => ({ question: `Q${index}`, answer: "A" }));
    await request(app)
      .patch(`/api/v1/applications/${application.id}`)
      .set("Cookie", cookie)
      .send({ answers: many });
    const over = await request(app)
      .post(path)
      .set("Cookie", cookie)
      .send({ questions: ["One more?"] });
    expect(over.status).toBe(409);
  });

  it("retries invalid JSON once, then fails with AI_FAILED", async () => {
    const fetchMock = enableFakeAi(() => ({ choices: [{ message: { content: "not json" } }] }));
    const { cookie, application } = await setup();
    const res = await request(app)
      .post(`/api/v1/applications/${application.id}/answers`)
      .set("Cookie", cookie)
      .send({});
    expect(res.status).toBe(502);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("drops answers that name skills the profile doesn't have (F10.6)", async () => {
    enableFakeAi((questions) => ({
      choices: [
        {
          message: {
            content: JSON.stringify({
              answers: questions.map((question, index) => ({
                question,
                answer:
                  index === 0 ? "I am an expert in Kubernetes and Rust." : "I built React pages.",
              })),
            }),
          },
        },
      ],
    }));
    const { cookie, application } = await setup();
    const res = await request(app)
      .post(`/api/v1/applications/${application.id}/answers`)
      .set("Cookie", cookie)
      .send({});
    expect(res.body.data.answers).toHaveLength(3);
    expect(res.body.data.answers.some((item) => item.answer.includes("Kubernetes"))).toBe(false);
  });

  it("stops at the daily cap (F10.8)", async () => {
    enableFakeAi(modelAnswer);
    const { cookie, application } = await setup();
    const path = `/api/v1/applications/${application.id}/answers`;
    const limit = env.AI_DAILY_LIMIT;
    env.AI_DAILY_LIMIT = 1;
    try {
      expect(
        (await request(app).post(path).set("Cookie", cookie).send({ regenerate: true })).status,
      ).toBe(200);
      const capped = await request(app).post(path).set("Cookie", cookie).send({ regenerate: true });
      expect(capped.status).toBe(429);
      expect(capped.body.error.code).toBe("AI_LIMIT_REACHED");
      const usage = await request(app).get("/api/v1/usage").set("Cookie", cookie);
      expect(usage.body.data).toMatchObject({ aiUsedToday: 2, aiDailyLimit: 1 });
    } finally {
      env.AI_DAILY_LIMIT = limit;
    }
  });
});
