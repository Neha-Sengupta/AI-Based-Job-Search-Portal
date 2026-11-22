// Signs a real user up through Better Auth and returns their session cookie for Supertest.
import { randomUUID } from "node:crypto";
import request from "supertest";

export const TEST_PASSWORD = "correct-horse-battery";

const cookieFrom = (res) =>
  (res.headers["set-cookie"] ?? []).map((cookie) => cookie.split(";")[0]).join("; ");

export async function signUp(app, overrides = {}) {
  const user = {
    name: "Test User",
    email: `user-${randomUUID().slice(0, 8)}@example.com`,
    password: TEST_PASSWORD,
    ...overrides,
  };
  const res = await request(app).post("/api/auth/sign-up/email").send(user);
  if (res.status !== 200)
    throw new Error(`Sign-up failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { cookie: cookieFrom(res), user: res.body.user, email: user.email };
}

export async function signIn(app, { email, password }) {
  const res = await request(app).post("/api/auth/sign-in/email").send({ email, password });
  return { res, cookie: cookieFrom(res) };
}
