import { describe, expect, it } from "vitest";
import { findSections, sectionKeyword, sectionTitleScore } from "./find-sections.js";
import { makeLine } from "./group-lines.js";

const line = (text, options = {}) => makeLine({ text, height: 10, ...options });

describe("sectionKeyword", () => {
  it.each([
    ["Work Experience", "experience"],
    ["EDUCATION:", "education"],
    ["  Technical   Skills ", "skills"],
    ["Skills & Tools", "skills"],
    ["Career Objective", "summary"],
    ["Personal Details", "ignored"],
    ["DECLARATION", "ignored"],
    ["Languages Known", "ignored"],
    ["Contact", "contact"],
    ["Software Engineer", null],
  ])("%j → %j", (text, section) => {
    expect(sectionKeyword(text)).toBe(section);
  });
});

describe("sectionTitleScore", () => {
  it.each([
    ["keyword + bold + short", line("Education", { bold: true }), 7],
    ["keyword + caps + short (no bold)", line("EXPERIENCE"), 6],
    ["keyword + DOCX heading", line("Projects", { heading: true }), 7],
    ["keyword + bigger text", line("Skills", { height: 13 }), 6],
    ["keyword, not alone on its line", line("Skills", { itemCount: 2 }), 4],
    ["bold short non-keyword", line("Infosys Ltd", { bold: true }), 3],
    ["bold caps short non-keyword", line("VOLUNTEERING", { bold: true }), 4],
    ["contains a date", line("Since 2019", { bold: true }), 0],
    ["contains @", line("me@example.com"), -2],
  ])("%s", (_label, input, score) => {
    expect(sectionTitleScore(input, 10)).toBe(score);
  });
});

describe("findSections", () => {
  const lines = [
    line("PRIYA SHARMA", { bold: true, height: 20 }),
    line("priya@example.com"),
    line("Education", { bold: true }),
    line("ABC College"),
    line("Contact", { bold: true }),
    line("+91 98765 43210"),
    line("VOLUNTEERING", { bold: true }),
    line("Won a hackathon"),
    line("Personal Details", { bold: true }),
    line("Date of Birth: 01/01/2000"),
  ];
  const { header, sections } = findSections(lines);

  it("keeps the big bold name in the header, plus any contact section", () => {
    expect(header.map((l) => l.text)).toEqual([
      "PRIYA SHARMA",
      "priya@example.com",
      "+91 98765 43210",
    ]);
  });

  it("names known sections, marks unknown titles as null and keeps ignored sections apart", () => {
    expect(sections.map(({ name, lines: sectionLines }) => [name, sectionLines.length])).toEqual([
      ["education", 1],
      [null, 1],
      ["ignored", 1],
    ]);
  });
});
