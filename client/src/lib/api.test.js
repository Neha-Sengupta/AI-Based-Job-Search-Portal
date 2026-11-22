import { describe, expect, it } from "vitest";
import { normalizeError } from "./api.js";
import { shouldRetry } from "./query-client.js";

describe("normalizeError", () => {
  it("keeps the server's error fields", () => {
    const error = normalizeError({
      response: {
        status: 400,
        data: {
          error: {
            code: "VALIDATION_ERROR",
            message: "Some fields are invalid.",
            fields: { email: "Invalid email" },
            requestId: "r1",
          },
        },
      },
    });
    expect(error).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Some fields are invalid.",
      fields: { email: "Invalid email" },
      status: 400,
      requestId: "r1",
    });
  });

  it("turns a failure with no response into NETWORK_ERROR", () => {
    expect(normalizeError(new Error("Network Error"))).toMatchObject({
      code: "NETWORK_ERROR",
      status: 0,
    });
  });

  it("falls back to a generic error when the body isn't our shape (e.g. a proxy's HTML page)", () => {
    expect(
      normalizeError({ response: { status: 502, data: "<html>Bad gateway</html>" } }),
    ).toMatchObject({
      code: "INTERNAL_ERROR",
      message: "Something went wrong",
      status: 502,
    });
  });
});

describe("shouldRetry", () => {
  it.each([
    [0, { code: "NETWORK_ERROR" }, true],
    [1, { status: 503 }, true],
    [2, { status: 503 }, false],
    [0, { status: 404 }, false],
    [0, { status: 400 }, false],
  ])("attempt %i with %j → %s", (count, error, expected) => {
    expect(shouldRetry(count, error)).toBe(expected);
  });
});
