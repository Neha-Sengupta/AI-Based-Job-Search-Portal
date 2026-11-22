import { describe, expect, it } from "vitest";
import { authErrorMessage, safeCallbackUrl } from "./auth-messages.js";

describe("authErrorMessage", () => {
  it.each([
    [{ status: 401, code: "INVALID_EMAIL_OR_PASSWORD" }, "Email or password is incorrect."],
    [
      { status: 422, code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" },
      "An account with this email already exists.",
    ],
    [{ status: 429 }, "Too many attempts. Please wait a minute and try again."],
    [{ status: 500 }, "Something went wrong. Please try again."],
  ])("%j → %s", (error, message) => {
    expect(authErrorMessage(error)).toBe(message);
  });
});

describe("safeCallbackUrl", () => {
  it.each([
    ["/tracker", "/tracker"],
    ["/jobs?q=react", "/jobs?q=react"],
    ["//evil.com", "/dashboard"],
    ["https://evil.com", "/dashboard"],
    [null, "/dashboard"],
  ])("%s → %s", (input, expected) => {
    expect(safeCallbackUrl(input)).toBe(expected);
  });
});
