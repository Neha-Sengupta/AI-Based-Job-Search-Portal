import { useTestDatabase } from "../../test/db.js";
import request from "supertest";
import mongoose from "mongoose";
import { describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { signIn, signUp, TEST_PASSWORD } from "../../test/auth.js";
import { createJob, createProfile } from "../../test/fixtures.js";
import { authMongoClient } from "../../lib/auth.js";

useTestDatabase();
const app = createApp();

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

describe("account (F9.4)", () => {
  it("deletes everything the user owns, and only theirs", async () => {
    const other = await signUp(app);
    await createProfile(app, other.cookie);

    const { cookie, user, email } = await signUp(app);
    await createProfile(app, cookie);
    await request(app)
      .post("/api/v1/profile/photo")
      .set("Cookie", cookie)
      .attach("file", PNG, "me.png");
    const job = await createJob();
    await request(app)
      .post("/api/v1/applications")
      .set("Cookie", cookie)
      .send({ jobId: String(job._id) });
    await request(app)
      .post("/api/v1/cvs")
      .set("Cookie", cookie)
      .send({
        templateId: "classic",
        title: "CV",
        content: { basics: { fullName: "Priya" }, skills: ["React"] },
      });

    expect((await request(app).delete("/api/v1/account").set("Cookie", cookie)).status).toBe(204);

    const db = mongoose.connection.db;
    const userId = new mongoose.Types.ObjectId(user.id);
    for (const collection of ["profiles", "cvs", "applications", "aiusages"]) {
      expect(await db.collection(collection).countDocuments({ userId })).toBe(0);
    }
    expect(await db.collection("files.files").countDocuments({ "metadata.userId": userId })).toBe(
      0,
    );
    expect(await authMongoClient.db().collection("user").countDocuments({ _id: userId })).toBe(0);

    // Signed out and gone: the old cookie and the password no longer work.
    expect((await request(app).get("/api/v1/profile").set("Cookie", cookie)).status).toBe(401);
    expect((await signIn(app, { email, password: TEST_PASSWORD })).res.status).toBe(401);
    // The other user is untouched.
    expect((await request(app).get("/api/v1/profile").set("Cookie", other.cookie)).status).toBe(
      200,
    );
  });

  it("reports AI usage", async () => {
    const { cookie } = await signUp(app);
    const res = await request(app).get("/api/v1/usage").set("Cookie", cookie);
    expect(res.body.data).toMatchObject({ aiUsedToday: 0, aiDailyLimit: 20 });
    expect(res.body.data.resetsAt).toMatch(/T00:00:00.000Z$/);
  });

  it("requires a session", async () => {
    expect((await request(app).delete("/api/v1/account")).status).toBe(401);
    expect((await request(app).get("/api/v1/usage")).status).toBe(401);
  });
});
