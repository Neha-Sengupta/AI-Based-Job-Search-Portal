import { describe, expect, it } from "vitest";
import { degreeToLevel, lowestLevelMentioned } from "./education.js";

describe("degreeToLevel", () => {
  it.each([
    ["B.Tech in Computer Science", { level: "bachelor", degree: "B.Tech" }],
    ["BTech (CSE)", { level: "bachelor", degree: "BTech" }],
    ["B.E. Mechanical", { level: "bachelor", degree: "B.E" }],
    ["BE Civil", { level: "bachelor", degree: "BE" }],
    ["B.Com", { level: "bachelor", degree: "B.Com" }],
    ["Bachelor of Arts", { level: "bachelor", degree: "Bachelor" }],
    ["MCA", { level: "master", degree: "MCA" }],
    ["Master’s in Statistics", { level: "master", degree: "Master's" }],
    ["Post Graduate Diploma", { level: "master", degree: "Post Graduate" }],
    ["PG Diploma in Data Science", { level: "master", degree: "PG Diploma" }],
    ["Diploma in Electrical Engineering", { level: "diploma", degree: "Diploma" }],
    ["12th (HSC), Maharashtra Board", { level: "high_school", degree: "12th" }],
    ["SSC", { level: "high_school", degree: "SSC" }],
    ["PUC (Science)", { level: "high_school", degree: "PUC" }],
    ["Ph.D. in Physics", { level: "doctorate", degree: "Ph.D" }],
    ["PhD", { level: "doctorate", degree: "PhD" }],
  ])("%j → %j", (text, expected) => {
    expect(degreeToLevel(text)).toEqual(expected);
  });

  it.each(["be a team player", "ma'am", "Computer Science", "Scrum Master", "", undefined])(
    "%j → null",
    (text) => {
      expect(degreeToLevel(text)).toBeNull();
    },
  );
});

describe("lowestLevelMentioned", () => {
  it.each([
    ["B.Tech or M.Tech", "bachelor"],
    ["MBA preferred; graduates may apply", "bachelor"],
    ["12th pass or graduate", "high_school"],
    ["Post graduate in any stream", "master"],
    ["PhD or Master's", "master"],
    ["No degree needed", null],
  ])("%j → %j", (text, expected) => {
    expect(lowestLevelMentioned(text)).toBe(expected);
  });
});
