import { describe, expect, it } from "vitest";
import { roleTitlePattern } from "./service.js";

describe("roleTitlePattern", () => {
  it("matches titles by the specific words of the target roles, not generic ones", () => {
    const pattern = roleTitlePattern(["Frontend Developer", "Data Analyst"]);
    expect(pattern.test("Senior Frontend Engineer")).toBe(true);
    expect(pattern.test("Data Analyst II")).toBe(true);
    expect(pattern.test("Backend Developer")).toBe(false);
    expect(pattern.test("Procurement Specialist")).toBe(false);
  });

  it("is null when every word is generic or there are no roles", () => {
    expect(roleTitlePattern(["Developer"])).toBeNull();
    expect(roleTitlePattern([])).toBeNull();
  });
});
