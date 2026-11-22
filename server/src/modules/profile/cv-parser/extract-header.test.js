import { describe, expect, it } from "vitest";
import { extractHeader, nameScore } from "./extract-header.js";
import { makeLine } from "./group-lines.js";

const line = (text, options = {}) => makeLine({ text, height: 10, page: 1, ...options });

describe("nameScore", () => {
  it.each([
    [
      "letters + biggest + first + bold + 2 words",
      line("Aarav Mehta", { bold: true, height: 20 }),
      0,
      10,
    ],
    ["plain name, not first", line("Aarav Mehta"), 2, 4],
    ["job title", line("Software Developer"), 1, 0],
    ["contact line", line("aarav@example.com | +91 98765 43210"), 1, -4],
    ["section keyword", line("Skills", { bold: true }), 1, 0],
  ])("%s", (_label, input, index, score) => {
    expect(nameScore(input, index, 20)).toBe(score);
  });
});

describe("extractHeader", () => {
  it("reads every header field", () => {
    const header = [
      line("ROHAN IYER", { bold: true, height: 20 }),
      line("Senior Software Engineer"),
      line("Bengaluru, Karnataka • ROHAN.IYER@example.com • 09876543210"),
      line("https://rohaniyer.dev • linkedin.com/in/rohan-iyer • github.com/rohaniyer"),
    ];
    expect(extractHeader(header)).toEqual({
      fullName: "Rohan Iyer",
      headline: "Senior Software Engineer",
      contactEmail: "rohan.iyer@example.com",
      phone: "09876543210",
      location: { city: "Bengaluru", country: "IN" },
      links: {
        linkedin: "https://linkedin.com/in/rohan-iyer",
        github: "https://github.com/rohaniyer",
        portfolio: "https://rohaniyer.dev",
      },
    });
  });

  it("sets the country from +91 even without a known city", () => {
    const header = [line("Asha Rao", { bold: true }), line("+91 98765 43210")];
    expect(extractHeader(header).location).toEqual({ city: null, country: "IN" });
  });

  it("falls back to the rest of the CV for email and phone, but not for links", () => {
    const header = [line("Asha Rao", { bold: true })];
    const searchable = [...header, line("asha@example.com"), line("github.com/asha/todo-app")];
    expect(extractHeader(header, searchable)).toMatchObject({
      contactEmail: "asha@example.com",
      links: undefined,
      headline: undefined,
    });
  });
});
