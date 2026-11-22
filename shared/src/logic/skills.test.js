import { describe, expect, it } from "vitest";
import { SKILLS } from "../constants/skills.js";
import { matchSkills, normalizeSkill, sameSkill, skillKey } from "./skills.js";

describe("SKILLS dictionary", () => {
  it("has no spelling shared by two skills", () => {
    const owners = new Map();
    const clashes = [];
    for (const { name, aliases } of SKILLS) {
      for (const spelling of [name, ...aliases]) {
        const key = skillKey(spelling);
        const owner = owners.get(key);
        if (owner && owner !== name) clashes.push(`${spelling}: ${owner} / ${name}`);
        owners.set(key, owner ?? name);
      }
    }
    expect(clashes).toEqual([]);
  });

  it("can reach every skill with a spelling of at most 3 words", () => {
    const unreachable = SKILLS.filter(({ name, aliases }) =>
      [name, ...aliases].every((spelling) => spelling.split(/\s+/).length > 3),
    );
    expect(unreachable).toEqual([]);
  });
});

describe("skillKey", () => {
  it.each([
    ["React.js", "reactjs"],
    ["React JS", "ReactJS"],
    ["  react  ", "reactjs"],
    ["JS", "JavaScript"],
    ["node", "Node.js"],
    ["golang", "Go"],
  ])("%j and %j get the same key", (a, b) => {
    expect(skillKey(a)).toBe(skillKey(b));
  });

  it.each([
    ["C", "C++"],
    ["C", "C#"],
    ["Java", "JavaScript"],
    [".NET", "net"],
  ])("%j and %j get different keys", (a, b) => {
    expect(skillKey(a)).not.toBe(skillKey(b));
  });

  it("returns the normalised text for unknown skills", () => {
    expect(skillKey("  Basket Weaving ")).toBe("basketweaving");
  });
});

describe("normalizeSkill", () => {
  it.each([
    ["js", "JavaScript"],
    ["React.js", "React"],
    ["ReactJS", "React"],
    ["node", "Node.js"],
    ["nodejs", "Node.js"],
    ["k8s", "Kubernetes"],
    ["c sharp", "C#"],
    ["go", "Go"],
    ["  Basket Weaving ", "Basket Weaving"],
  ])("%j → %j", (input, expected) => {
    expect(normalizeSkill(input)).toBe(expected);
  });
});

describe("sameSkill", () => {
  it.each([
    ["JS", "javascript", true],
    ["Postgres", "PostgreSQL", true],
    ["Java", "JavaScript", false],
    ["C", "C++", false],
  ])("%j vs %j → %j", (a, b, expected) => {
    expect(sameSkill(a, b)).toBe(expected);
  });
});

describe("matchSkills", () => {
  it.each([
    ["Strong JS and React.js skills", ["JavaScript", "React"]],
    ["We use ReactJS, Node and MongoDB", ["React", "Node.js", "MongoDB"]],
    ["JavaScript developer", ["JavaScript"]],
    ["Java and JavaScript", ["Java", "JavaScript"]],
    ["C/C++, C# and .NET", ["C", "C++", "C#", ".NET"]],
    ["Experience with Node.js.", ["Node.js"]],
    ["HTML/CSS and CI/CD pipelines", ["HTML", "CSS", "CI/CD"]],
    ["Spring Boot microservices", ["Spring Boot", "Microservices"]],
    ["React Native apps", ["React Native"]],
    ["Python, python3 and Py", ["Python"]],
    ["Basic MS Excel and Tally ERP", ["Excel", "Tally"]],
    ["Building REST APIs", ["REST"]],
    ["no skills here at all", []],
  ])("%j → %j", (text, expected) => {
    expect(matchSkills(text)).toEqual(expected);
  });

  it.each([
    ["Backend in Go and R", ["Go", "R"]],
    ["Systems programming in C", ["C"]],
    ["You will go to client sites", []],
    ["we use r and c daily", []],
    ["Express your ideas with express", ["Express"]],
    ["Golang services", ["Go"]],
  ])("ambiguous skills match only in exact capitalisation: %j → %j", (text, expected) => {
    expect(matchSkills(text)).toEqual(expected);
  });

  it("matches ambiguous skills in any case inside a skills list", () => {
    expect(matchSkills("go, r, c, swift, rust", { listContext: true })).toEqual([
      "Go",
      "R",
      "C",
      "Swift",
      "Rust",
    ]);
  });

  it("returns each skill once, in order of first appearance", () => {
    expect(matchSkills("Docker, JS, docker, JavaScript, Docker")).toEqual(["Docker", "JavaScript"]);
  });

  it("handles empty input", () => {
    expect(matchSkills("")).toEqual([]);
    expect(matchSkills(undefined)).toEqual([]);
  });
});
