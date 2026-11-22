import { describe, expect, it } from "vitest";
import {
  extractCertifications,
  extractProjects,
  extractSkills,
  extractSummary,
  toCertification,
} from "./extract-lists.js";
import { makeLine } from "./group-lines.js";

const line = (text, options = {}) => makeLine({ text, ...options });

describe("extractSkills", () => {
  it("drops labels, splits on separators, normalizes and de-duplicates", () => {
    const skills = extractSkills([
      line("Languages: Java, python | JS"),
      line("• HTML/CSS, CI/CD; react.js"),
      line("Java"),
    ]);
    expect(skills).toEqual(["Java", "Python", "JavaScript", "HTML", "CSS", "CI/CD", "React"]);
  });

  it("skips sentences and caps the list at 100", () => {
    const many = Array.from({ length: 120 }, (_, i) => `Skill${i}`).join(", ");
    expect(extractSkills([line(many)])).toHaveLength(100);
    expect(extractSkills([line("I am a quick learner and a great team player")])).toEqual([]);
  });
});

describe("extractProjects", () => {
  it("reads name, bullets, URL and the skills mentioned", () => {
    const [first, second] = extractProjects([
      line("Smart Attendance System | React, Node.js, MongoDB", { bold: true }),
      line("• Built QR-code attendance for 200 students."),
      line("Library Portal", { bold: true }),
      line("Desktop app for issuing and returning books."),
      line("Source: github.com/someone/library-portal"),
    ]);
    expect(first).toMatchObject({
      name: "Smart Attendance System",
      bullets: ["Built QR-code attendance for 200 students."],
      skills: ["React", "Node.js", "MongoDB"],
      url: null,
    });
    expect(second).toMatchObject({
      name: "Library Portal",
      description: "Desktop app for issuing and returning books.",
      url: "https://github.com/someone/library-portal",
    });
  });
});

describe("certifications", () => {
  it.each([
    [
      "Python for Everybody – Coursera (2021)",
      { name: "Python for Everybody", issuer: "Coursera", date: "2021-01-01" },
    ],
    [
      "AWS Certified Solutions Architect | Amazon Web Services | 2022",
      {
        name: "AWS Certified Solutions Architect",
        issuer: "Amazon Web Services",
        date: "2022-01-01",
      },
    ],
    [
      "Certified ScrumMaster by Scrum Alliance, Mar 2016",
      { name: "Certified ScrumMaster", issuer: "Scrum Alliance", date: "2016-03-01" },
    ],
    ["Google UX Certificate", { name: "Google UX Certificate", issuer: null, date: null }],
  ])("%j", (text, expected) => {
    expect(toCertification(text)).toMatchObject(expected);
  });

  it("reads one per line and joins a lower-case continuation", () => {
    const certs = extractCertifications([
      line("• Oracle Certified Java Programmer"),
      line("professional edition"),
      line("• PMP"),
    ]);
    expect(certs.map((cert) => cert.name)).toEqual([
      "Oracle Certified Java Programmer professional edition",
      "PMP",
    ]);
  });
});

describe("extractSummary", () => {
  it("joins lines and keeps at most 1,000 characters", () => {
    expect(extractSummary([line("Motivated graduate"), line("seeking a role.")])).toBe(
      "Motivated graduate seeking a role.",
    );
    expect(extractSummary([line("word ".repeat(400))]).length).toBeLessThanOrEqual(1000);
    expect(extractSummary([])).toBeNull();
  });
});
