import { useTestDatabase } from "../../test/db.js";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { createApp } from "../../app.js";
import { signUp } from "../../test/auth.js";
import { createJob, createProfile } from "../../test/fixtures.js";
import { closePdfBrowser } from "./pdf.js";
import { Application } from "../applications/model.js";

useTestDatabase();
const app = createApp();
afterAll(() => closePdfBrowser());

async function pdfText(buffer) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const page = await doc.getPage(1);
  return (await page.getTextContent()).items.map((item) => item.str).join(" ");
}

async function setup() {
  const { cookie } = await signUp(app);
  await createProfile(app, cookie, { fullName: "Priya <script>alert(1)</script> Sharma" });
  const job = await createJob({ title: "Frontend Web Developer" });
  return { cookie, job };
}

describe("CVs API (F7)", () => {
  it("tailors, saves, lists, downloads and deletes a CV", async () => {
    const { cookie, job } = await setup();
    const tailored = await request(app)
      .post("/api/v1/cvs/tailor")
      .set("Cookie", cookie)
      .send({ templateId: "classic", jobId: String(job._id) });
    expect(tailored.status).toBe(200);
    expect(tailored.body.data.content.skills.slice(0, 2)).toEqual(["React", "JavaScript"]);
    expect(tailored.body.data.missingRequirements).toEqual([]);

    const preview = await request(app)
      .post("/api/v1/cvs/preview")
      .set("Cookie", cookie)
      .send({ templateId: "classic", content: tailored.body.data.content });
    expect(preview.status).toBe(200);
    expect(preview.body.data.html).toContain("&lt;script&gt;");
    expect(preview.body.data.html).not.toContain("<script>alert");

    const created = await request(app)
      .post("/api/v1/cvs")
      .set("Cookie", cookie)
      .send({
        templateId: "classic",
        jobId: String(job._id),
        title: "Frontend – Acme",
        content: tailored.body.data.content,
      });
    expect(created.status).toBe(201);
    const id = created.body.data.id;

    const list = await request(app).get("/api/v1/cvs").set("Cookie", cookie);
    expect(list.body.data[0]).toMatchObject({
      id,
      title: "Frontend – Acme",
      job: { title: "Frontend Web Developer" },
    });

    const pdf = await request(app)
      .get(`/api/v1/cvs/${id}/download`)
      .set("Cookie", cookie)
      .buffer(true)
      .parse((res, done) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => done(null, Buffer.concat(chunks)));
      });
    expect(pdf.status).toBe(200);
    expect(pdf.headers["content-type"]).toBe("application/pdf");
    expect(pdf.headers["content-disposition"]).toBe(
      'attachment; filename="Priya scriptalert1script Sharma - Frontend  Acme.pdf"',
    );
    const text = await pdfText(pdf.body);
    expect(text).toContain("<script>alert(1)</script>"); // printed literally, never run (F7.9)
    expect(text).toContain("React"); // real, selectable text (F7.8)

    expect((await request(app).delete(`/api/v1/cvs/${id}`).set("Cookie", cookie)).status).toBe(204);
    expect((await request(app).get(`/api/v1/cvs/${id}`).set("Cookie", cookie)).status).toBe(404);
  }, 30_000);

  it("rejects a CV with a skill that isn't in the profile (F7.6)", async () => {
    const { cookie } = await setup();
    const res = await request(app)
      .post("/api/v1/cvs")
      .set("Cookie", cookie)
      .send({
        templateId: "modern",
        title: "Mine",
        content: { basics: { fullName: "Priya" }, skills: ["React", "Kubernetes"] },
      });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("Kubernetes");
  });

  it("hides another user's CV (F7.12) and requires a session", async () => {
    const a = await setup();
    const created = await request(app)
      .post("/api/v1/cvs")
      .set("Cookie", a.cookie)
      .send({
        templateId: "compact",
        title: "A's CV",
        content: { basics: { fullName: "A" }, skills: ["React"] },
      });
    const b = await setup();
    const id = created.body.data.id;
    expect((await request(app).get(`/api/v1/cvs/${id}`).set("Cookie", b.cookie)).status).toBe(404);
    expect(
      (await request(app).get(`/api/v1/cvs/${id}/download`).set("Cookie", b.cookie)).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .patch(`/api/v1/cvs/${id}`)
          .set("Cookie", b.cookie)
          .send({ title: "Hacked" })
      ).status,
    ).toBe(404);
    expect((await request(app).delete(`/api/v1/cvs/${id}`).set("Cookie", b.cookie)).status).toBe(
      404,
    );
    expect((await request(app).get("/api/v1/cvs")).status).toBe(401);
  });

  it("marks applications when their CV is deleted (F8.6)", async () => {
    const { cookie, job } = await setup();
    const cv = await request(app)
      .post("/api/v1/cvs")
      .set("Cookie", cookie)
      .send({
        templateId: "classic",
        title: "CV",
        content: { basics: { fullName: "Priya" }, skills: ["React"] },
      });
    const application = await request(app)
      .post("/api/v1/applications")
      .set("Cookie", cookie)
      .send({ jobId: String(job._id), status: "applied", cvId: cv.body.data.id });
    await request(app).delete(`/api/v1/cvs/${cv.body.data.id}`).set("Cookie", cookie);
    const after = await Application.findById(application.body.data.id).lean();
    expect(after).toMatchObject({ cvId: null, cvDeleted: true });
  });
});
