import { useTestDatabase } from "../test/db.js";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { signIn, signUp, TEST_PASSWORD } from "../test/auth.js";

useTestDatabase();
const app = createApp();

describe("auth (F1)", () => {
  it("sign-up creates a user and signs them in (F1.1)", async () => {
    const { cookie, user } = await signUp(app, { name: "Priya" });
    expect(user).toMatchObject({ name: "Priya" });
    expect(cookie).toContain("better-auth.session_token=");

    const session = await request(app).get("/api/auth/get-session").set("Cookie", cookie);
    expect(session.body.user.email).toBe(user.email);
  });

  it("returns 401 without a session cookie (F1.4)", async () => {
    const res = await request(app).get("/api/v1/profile");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns 401 with a forged cookie (F1.5)", async () => {
    const res = await request(app)
      .get("/api/v1/profile")
      .set("Cookie", "better-auth.session_token=forged.value");
    expect(res.status).toBe(401);
  });

  it("lets a valid session through to the API", async () => {
    const { cookie } = await signUp(app);
    const res = await request(app).get("/api/v1/profile").set("Cookie", cookie);
    expect(res.status).toBe(404); // signed in, but no profile yet
  });

  it("gives the same answer for a wrong password and an unknown email (F1.6)", async () => {
    const { email } = await signUp(app);
    const wrongPassword = await signIn(app, { email, password: "not-the-password" });
    const unknownEmail = await signIn(app, {
      email: "nobody@example.com",
      password: TEST_PASSWORD,
    });
    expect(wrongPassword.res.status).toBe(401);
    expect(unknownEmail.res.status).toBe(401);
    expect(wrongPassword.res.body.code).toBe(unknownEmail.res.body.code);
    expect(wrongPassword.cookie).not.toContain("session_token");
  });

  it("signs in with the right password", async () => {
    const { email } = await signUp(app);
    const { res, cookie } = await signIn(app, { email, password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    expect(cookie).toContain("better-auth.session_token=");
  });

  it("ends the session on sign out (F1.7)", async () => {
    const { cookie } = await signUp(app);
    const out = await request(app)
      .post("/api/auth/sign-out")
      .set("Cookie", cookie)
      .set("Origin", "http://localhost:3000");
    expect(out.status).toBe(200);
    const after = await request(app).get("/api/v1/profile").set("Cookie", cookie);
    expect(after.status).toBe(401);
  });

  it("refuses a second account with the same email (F1.8)", async () => {
    const { email } = await signUp(app);
    const again = await request(app)
      .post("/api/auth/sign-up/email")
      .send({ name: "Again", email, password: TEST_PASSWORD });
    expect(again.status).toBeGreaterThanOrEqual(400);
    expect(again.body.code).toMatch(/^USER_ALREADY_EXISTS/);
  });

  it("enforces the password length on the server (F1.10)", async () => {
    const res = await request(app)
      .post("/api/auth/sign-up/email")
      .send({ name: "Short", email: "short@example.com", password: "1234567" });
    expect(res.status).toBe(400);
  });
});
