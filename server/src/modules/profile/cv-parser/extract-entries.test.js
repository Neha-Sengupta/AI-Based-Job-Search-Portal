import { describe, expect, it } from "vitest";
import { splitEntries, toEducation, toExperience, typicalGap } from "./extract-entries.js";
import { makeLine } from "./group-lines.js";

const line = (text, options = {}) => makeLine({ text, ...options });
const at = (text, y, options = {}) => line(text, { y, x: 40, page: 1, height: 9, ...options });
const texts = (entries) => entries.map((entry) => entry.map((l) => l.text));

describe("splitEntries", () => {
  it("starts an entry after a gap 1.4× the typical line gap (PDF)", () => {
    const lines = [
      at("Data Analyst", 0),
      at("Quantiva Ltd", 12),
      at("- Built dashboards", 24),
      at("Intern", 44),
      at("TCS", 56),
    ];
    expect(typicalGap(lines)).toBe(12);
    expect(texts(splitEntries(lines))).toEqual([
      ["Data Analyst", "Quantiva Ltd", "- Built dashboards"],
      ["Intern", "TCS"],
    ]);
  });

  it("starts an entry on a bold line or a date range after bullets (DOCX: no positions)", () => {
    const lines = [
      line("Zentrix Pvt Ltd", { bold: true }),
      line("Project Manager | Jan 2019 – Present"),
      line("• Ran delivery"),
      line("Orbit Ltd", { bold: true }),
      line("• Wrote specs"),
      line("Analyst | 2012 – 2014"),
    ];
    expect(texts(splitEntries(lines))).toEqual([
      ["Zentrix Pvt Ltd", "Project Manager | Jan 2019 – Present", "• Ran delivery"],
      ["Orbit Ltd", "• Wrote specs"],
      ["Analyst | 2012 – 2014"],
    ]);
  });

  it("starts an entry on a second date range with no bullets in between", () => {
    const lines = [line("MBA, Symbiosis Institute | 2012 – 2014"), line("B.E., RTU | 2008 – 2012")];
    expect(splitEntries(lines)).toHaveLength(2);
  });
});

describe("toExperience", () => {
  it.each([
    [
      "title | company | city + dates on one line",
      [line("Software Engineer | Infosys Ltd | Mysuru Jul 2017 – Mar 2021")],
      {
        title: "Software Engineer",
        company: "Infosys Ltd",
        location: "Mysuru",
        startDate: "2017-07-01",
        endDate: "2021-03-01",
      },
    ],
    [
      "bold company, then title with dates",
      [
        line("Zentrix Technologies Pvt Ltd", { bold: true }),
        line("Project Manager | Jan 2019 – Present"),
      ],
      {
        title: "Project Manager",
        company: "Zentrix Technologies Pvt Ltd",
        startDate: "2019-01-01",
        endDate: null,
        current: true,
      },
    ],
    [
      "title at company",
      [line("Backend Developer at Acme Labs, Pune"), line("2020 - 2022")],
      {
        title: "Backend Developer",
        company: "Acme Labs",
        location: "Pune",
        startDate: "2020-01-01",
      },
    ],
    [
      "no dates",
      [line("Trainee"), line("Acme Solutions")],
      { title: "Trainee", company: "Acme Solutions", startDate: null },
    ],
  ])("%s", (_label, lines, expected) => {
    expect(toExperience(lines)).toMatchObject(expected);
  });

  it("joins wrapped bullet lines and keeps the schema limits", () => {
    const bulletLines = Array.from({ length: 12 }, (_, i) => line(`• Did thing ${i}`, { x: 50 }));
    const { bullets } = toExperience([
      line("Developer | Acme Ltd | 2020 – 2021", { x: 40 }),
      line("• Fixed bugs in the API, which reduced errors", { x: 50 }),
      line("over the whole year", { x: 57 }),
      line(`• ${"word ".repeat(80)}`, { x: 50 }),
      ...bulletLines,
    ]);
    expect(bullets[0]).toBe("Fixed bugs in the API, which reduced errors over the whole year");
    expect(bullets).toHaveLength(10);
    expect(bullets[1].length).toBeLessThanOrEqual(300);
  });
});

describe("toEducation", () => {
  it.each([
    [
      "B.Tech in Computer Science and Engineering",
      "bachelor",
      "B.Tech",
      "Computer Science and Engineering",
    ],
    ["B.E. Mechanical Engineering", "bachelor", "B.E", "Mechanical Engineering"],
    ["BCA", "bachelor", "BCA", null],
    ["MCA in Computer Applications", "master", "MCA", "Computer Applications"],
    ["MBA (Operations)", "master", "MBA", "Operations"],
    ["M.Sc Statistics", "master", "M.Sc", "Statistics"],
    ["Ph.D in Physics", "doctorate", "Ph.D", "Physics"],
    ["Diploma in Civil Engineering", "diploma", "Diploma", "Civil Engineering"],
    ["12th (HSC)", "high_school", "12th", "HSC"],
    ["10th, SSC", "high_school", "10th", null],
  ])("%j → %s", (degreeLine, level, degree, field) => {
    const entry = toEducation([line("ABC College of Engineering, Pune"), line(degreeLine)]);
    expect(entry).toMatchObject({
      institution: "ABC College of Engineering",
      level,
      degree,
      field,
    });
  });

  it("reads dates, the passing year and the grade", () => {
    expect(
      toEducation([line("XYZ Institute of Technology 2019 – 2023"), line("B.Tech, CGPA: 8.4/10")]),
    ).toMatchObject({
      startDate: "2019-01-01",
      endDate: "2023-01-01",
      grade: "CGPA: 8.4/10",
    });
    expect(toEducation([line("Kendriya Vidyalaya"), line("12th (CBSE), 2020, 91%")])).toMatchObject(
      {
        startDate: null,
        endDate: "2020-01-01",
        grade: "91%",
      },
    );
  });

  it("leaves the institution empty when no line names one", () => {
    expect(toEducation([line("B.Tech, 2019 – 2023")]).institution).toBeNull();
  });
});
