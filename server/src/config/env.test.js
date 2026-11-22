import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseEnv } from "./env.js";

const valid = {
  APP_URL: "http://localhost:3000",
  MONGODB_URI: "mongodb://127.0.0.1:27017/x",
  BETTER_AUTH_SECRET: "x".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
  INTERNAL_API_KEY: "k".repeat(32),
};

describe("parseEnv", () => {
  it("applies defaults", () => {
    expect(parseEnv(valid)).toMatchObject({
      NODE_ENV: "development",
      PORT: 4000,
      TRUST_PROXY_HOPS: 0,
    });
  });

  it("coerces numbers", () => {
    expect(parseEnv({ ...valid, PORT: "8080", TRUST_PROXY_HOPS: "2" })).toMatchObject({
      PORT: 8080,
      TRUST_PROXY_HOPS: 2,
    });
  });

  it("lists every problem by name", () => {
    expect(() => parseEnv({ MONGODB_URI: "postgres://nope" })).toThrow(/APP_URL[\s\S]*MONGODB_URI/);
  });

  it("never includes the values in the message", () => {
    expect(() => parseEnv({ ...valid, MONGODB_URI: "secret-value" })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining("secret-value") }),
    );
  });
});

describe("start-up with a missing variable", () => {
  it("exits with code 1 and explains what's wrong", () => {
    const envFile = fileURLToPath(new URL("./env.js", import.meta.url));
    const result = spawnSync(
      process.execPath,
      ["--input-type=module", "-e", `await import(${JSON.stringify(envFile)})`],
      {
        env: { PATH: process.env.PATH, MONGODB_URI: "mongodb://127.0.0.1:27017/x" },
        encoding: "utf8",
      },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("APP_URL");
  });
});
