import { useTestDatabase } from "../../test/db.js";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { signUp } from "../../test/auth.js";

useTestDatabase();
const app = createApp();

// A real 1×1 PNG, so content-type detection sees an image.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

async function userWithProfile(fields = {}) {
  const { cookie, user } = await signUp(app);
  const res = await request(app)
    .post("/api/v1/profile")
    .set("Cookie", cookie)
    .send({ fullName: "Priya Sharma", source: "form", ...fields });
  expect(res.status).toBe(201);
  return { cookie, user, profile: res.body.data };
}

describe("profile API (F2, F3)", () => {
  it("creates a profile and returns completeness and tips", async () => {
    const { profile } = await userWithProfile({ location: { country: "in" }, skills: ["react"] });
    expect(profile).toMatchObject({
      fullName: "Priya Sharma",
      source: "form",
      location: { country: "IN" },
    });
    expect(profile.completeness.percent).toBeGreaterThan(0);
    expect(profile.tips.length).toBeGreaterThan(0);
    expect(profile).not.toHaveProperty("userId");
  });

  it("rejects a second profile with 409", async () => {
    const { cookie } = await userWithProfile();
    const res = await request(app)
      .post("/api/v1/profile")
      .set("Cookie", cookie)
      .send({ fullName: "Again", source: "form" });
    expect(res.status).toBe(409);
  });

  it("rejects a blank full name with a field error (F2.8)", async () => {
    const { cookie } = await signUp(app);
    const res = await request(app)
      .post("/api/v1/profile")
      .set("Cookie", cookie)
      .send({ fullName: "   ", source: "form" });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toHaveProperty("fullName", "Required");
  });

  it("stores endDate as null for a current job and checks date order (F2.9, F2.10)", async () => {
    const { cookie } = await userWithProfile();
    const current = await request(app)
      .patch("/api/v1/profile")
      .set("Cookie", cookie)
      .send({
        experience: [
          {
            title: "Dev",
            company: "Acme",
            startDate: "2023-01-01",
            endDate: "2024-01-01",
            current: true,
          },
        ],
      });
    expect(current.status).toBe(200);
    expect(current.body.data.experience[0]).toMatchObject({
      startDate: "2023-01-01",
      endDate: null,
      current: true,
    });

    const backwards = await request(app)
      .patch("/api/v1/profile")
      .set("Cookie", cookie)
      .send({
        experience: [
          { title: "Dev", company: "Acme", startDate: "2024-01-01", endDate: "2023-01-01" },
        ],
      });
    expect(backwards.status).toBe(400);
    expect(backwards.body.error.fields).toHaveProperty("experience.0.endDate");
  });

  it("de-duplicates skills case-insensitively (F2.11)", async () => {
    const { cookie } = await userWithProfile();
    const res = await request(app)
      .patch("/api/v1/profile")
      .set("Cookie", cookie)
      .send({ skills: ["React", "react", "React "] });
    expect(res.body.data.skills).toEqual(["React"]);
  });

  it("ignores a userId in the body and only changes the caller's profile (F2.14)", async () => {
    const a = await userWithProfile({ fullName: "User A" });
    const b = await userWithProfile({ fullName: "User B" });
    await request(app)
      .patch("/api/v1/profile")
      .set("Cookie", b.cookie)
      .send({ userId: a.user.id, headline: "Changed by B" });
    const profileA = await request(app).get("/api/v1/profile").set("Cookie", a.cookie);
    expect(profileA.body.data.headline ?? null).toBeNull();
    const profileB = await request(app).get("/api/v1/profile").set("Cookie", b.cookie);
    expect(profileB.body.data.headline).toBe("Changed by B");
  });

  it("rejects an empty PATCH", async () => {
    const { cookie } = await userWithProfile();
    const res = await request(app).patch("/api/v1/profile").set("Cookie", cookie).send({});
    expect(res.status).toBe(400);
  });

  it("returns 404 for a user without a profile, even when others have one", async () => {
    await userWithProfile();
    const { cookie } = await signUp(app);
    expect((await request(app).get("/api/v1/profile").set("Cookie", cookie)).status).toBe(404);
  });

  it("uploads, serves and deletes a photo; other users can't see it (F2.13)", async () => {
    const a = await userWithProfile();
    const upload = await request(app)
      .post("/api/v1/profile/photo")
      .set("Cookie", a.cookie)
      .attach("file", PNG, "me.png");
    expect(upload.status).toBe(200);
    expect(upload.body.data.photoUrl).toMatch(/^\/api\/v1\/profile\/photo\?v=[a-f0-9]{24}$/);

    const own = await request(app).get("/api/v1/profile/photo").set("Cookie", a.cookie);
    expect(own.status).toBe(200);
    expect(own.headers["content-type"]).toBe("image/png");
    expect(own.headers["cache-control"]).toBe("private, max-age=300");

    const b = await userWithProfile();
    expect((await request(app).get("/api/v1/profile/photo").set("Cookie", b.cookie)).status).toBe(
      404,
    );

    expect(
      (await request(app).delete("/api/v1/profile/photo").set("Cookie", a.cookie)).status,
    ).toBe(204);
    expect((await request(app).get("/api/v1/profile/photo").set("Cookie", a.cookie)).status).toBe(
      404,
    );
  });

  it("rejects a non-image photo with 415, detected from content", async () => {
    const { cookie } = await userWithProfile();
    const res = await request(app)
      .post("/api/v1/profile/photo")
      .set("Cookie", cookie)
      .attach("file", Buffer.from("MZ fake exe"), "photo.png");
    expect(res.status).toBe(415);
  });

  it("rejects an exe renamed to .pdf with 415 (F2.5) and a 6 MB CV with 413 (F2.6)", async () => {
    const { cookie } = await signUp(app);
    const exe = await request(app)
      .post("/api/v1/profile/cv-upload")
      .set("Cookie", cookie)
      .attach("file", Buffer.from("MZ\x90\x00 this is not a pdf"), "cv.pdf");
    expect(exe.status).toBe(415);

    const big = await request(app)
      .post("/api/v1/profile/cv-upload")
      .set("Cookie", cookie)
      .attach("file", Buffer.alloc(6 * 1024 * 1024, 1), "cv.pdf");
    expect(big.status).toBe(413);
  });

  it("refuses an uploadedCvFileId that isn't the caller's file", async () => {
    const { cookie } = await signUp(app);
    const res = await request(app)
      .post("/api/v1/profile")
      .set("Cookie", cookie)
      .send({ fullName: "X", source: "cv_upload", uploadedCvFileId: "65f1c2a9b4e8d7f6a5b4c3d2" });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toHaveProperty("uploadedCvFileId");
  });

  it("requires a session for every profile route", async () => {
    for (const [method, path] of [
      ["get", "/api/v1/profile"],
      ["patch", "/api/v1/profile"],
      ["post", "/api/v1/profile/photo"],
      ["get", "/api/v1/profile/cv-download"],
    ]) {
      expect((await request(app)[method](path)).status).toBe(401);
    }
  });
});
