import { describe, expect, it } from "vitest";
import pino from "pino";
import { REDACT_PATHS } from "./logger.js";

describe("logger redaction", () => {
  it("hides cookies, the internal key and the CV file name (the user's name)", () => {
    const lines = [];
    const log = pino(
      { redact: { paths: REDACT_PATHS, censor: "[redacted]" } },
      { write: (line) => lines.push(JSON.parse(line)) },
    );
    log.info({
      req: { headers: { cookie: "session=abc", "x-internal-key": "secret-key", host: "x" } },
      res: { headers: { "content-disposition": 'attachment; filename="Priya Sharma - CV.pdf"' } },
    });
    const [entry] = lines;
    expect(entry.req.headers.cookie).toBe("[redacted]");
    expect(entry.req.headers["x-internal-key"]).toBe("[redacted]");
    expect(entry.res.headers["content-disposition"]).toBe("[redacted]");
    expect(entry.req.headers.host).toBe("x");
  });
});
