import request from "supertest";
import { describe, expect, it, vi } from "vitest";

vi.mock("./lib/db.js", () => ({ pingDb: vi.fn(async () => true) }));

const { createApp } = await import("./app.js");
const { pingDb } = await import("./lib/db.js");

describe("app", () => {
  const app = createApp();

  it("answers an unknown route with the standard 404 shape and a request id", async () => {
    const res = await request(app).get("/api/v1/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "We couldn't find that.",
        requestId: res.headers["x-request-id"],
      },
    });
    expect(res.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("rejects malformed JSON before reaching routes", async () => {
    const res = await request(app)
      .post("/api/v1/anything")
      .set("Content-Type", "application/json")
      .send("{oops");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("sets security headers and only allows APP_URL for CORS", async () => {
    const res = await request(app).get("/health").set("Origin", "http://localhost:3000");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  describe("GET /health", () => {
    it("is 200 when the database answers", async () => {
      pingDb.mockResolvedValueOnce(true);
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ data: { status: "ok" } });
    });

    it("is not rate limited, so the host's frequent health checks never get a 429", async () => {
      pingDb.mockResolvedValueOnce(true);
      const res = await request(app).get("/health");
      expect(res.headers.ratelimit).toBeUndefined();
    });

    it("is 503 when the database is down", async () => {
      pingDb.mockResolvedValueOnce(false);
      const res = await request(app).get("/health");
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ data: { status: "db_unavailable" } });
    });
  });
});
