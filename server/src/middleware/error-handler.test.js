import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { errorHandler } from "./error-handler.js";
import { validate } from "./validate.js";

// A tiny app with one route per error type, ending in the real error handler.
function appThrowing(makeError) {
  const app = express();
  app.use((req, _res, next) => {
    req.id = "req-123";
    req.log = logger;
    next();
  });
  app.use(express.json({ limit: "1kb" }));
  app.post("/boom", () => {
    throw makeError();
  });
  app.use(errorHandler);
  return app;
}

const post = (app, body = "{}") =>
  request(app).post("/boom").set("Content-Type", "application/json").send(body);

describe("errorHandler", () => {
  it("turns an AppError into its code, status and message, with requestId and details", async () => {
    const app = appThrowing(
      () =>
        new AppError("CONFLICT", "Already in your tracker", { details: { applicationId: "a1" } }),
    );
    const res = await post(app);
    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: {
        code: "CONFLICT",
        message: "Already in your tracker",
        details: { applicationId: "a1" },
        requestId: "req-123",
      },
    });
  });

  it("turns a ZodError into 400 with every field, paths joined with dots", async () => {
    const schema = z.object({
      email: z.email(),
      experience: z.array(z.object({ startDate: z.string() })),
    });
    const app = appThrowing(() => schema.safeParse({ email: "x", experience: [{}] }).error);
    const res = await post(app);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(Object.keys(res.body.error.fields).sort()).toEqual(["email", "experience.0.startDate"]);
  });

  it("turns malformed JSON into 400 VALIDATION_ERROR", async () => {
    const res = await post(
      appThrowing(() => new Error("unreachable")),
      "{bad json",
    );
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("turns a body over the limit into 413", async () => {
    const res = await post(
      appThrowing(() => new Error("unreachable")),
      JSON.stringify({ text: "x".repeat(2000) }),
    );
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("turns a Mongo duplicate key into 409", async () => {
    const res = await post(
      appThrowing(() => Object.assign(new Error("E11000 duplicate key"), { code: 11000 })),
    );
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("hides unexpected errors behind a generic 500", async () => {
    const res = await post(
      appThrowing(() => new Error("connection string mongodb://user:pass@host leaked")),
    );
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: { code: "INTERNAL_ERROR", message: "Something went wrong", requestId: "req-123" },
    });
  });
});

describe("validate", () => {
  it("puts parsed input on req.valid and rejects bad input with 400", async () => {
    const app = express();
    app.use(express.json());
    app.post(
      "/items",
      validate({ body: z.object({ name: z.string().trim().min(1) }) }),
      (req, res) => {
        res.json({ data: req.valid.body });
      },
    );
    app.use(errorHandler);

    const ok = await request(app).post("/items").send({ name: "  CV ", extra: "dropped" });
    expect(ok.body).toEqual({ data: { name: "CV" } });

    const bad = await request(app).post("/items").send({ name: " " });
    expect(bad.status).toBe(400);
    expect(bad.body.error.fields).toHaveProperty("name");
  });
});

describe("AppError", () => {
  it("refuses codes outside the allowed list", () => {
    expect(() => new AppError("TEAPOT", "nope")).toThrow(TypeError);
  });
});
