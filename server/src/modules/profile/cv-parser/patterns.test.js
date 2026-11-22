import { describe, expect, it } from "vitest";
import { findCity, findDates, findGrade, findPhone, findState, truncate } from "./patterns.js";

describe("findPhone", () => {
  it.each([
    ["+91 98765 43210", "+91 98765 43210"],
    ["09876543210", "09876543210"],
    ["98765-43210", "98765-43210"],
    ["9876543210", "9876543210"],
    ["Mobile: +91-9123456789 | Email", "+91-9123456789"],
    ["919876543210", "919876543210"],
    ["Call +1 (415) 555-0100", "+1 (415) 555-0100"],
  ])("finds %j", (text, expected) => {
    expect(findPhone(text)).toBe(expected);
  });

  it.each([
    ["2019 - 2023"],
    ["12345 67890"], // Indian mobiles start with 6–9
    ["Pincode 411001"],
    ["98765 4321"], // 9 digits
  ])("ignores %j", (text) => {
    expect(findPhone(text)).toBeUndefined();
  });
});

describe("findDates", () => {
  it.each([
    ["Jan 2022 – Mar 2023", { startDate: "2022-01-01", endDate: "2023-03-01", current: false }],
    [
      "January 2022 to December 2022",
      { startDate: "2022-01-01", endDate: "2022-12-01", current: false },
    ],
    ["Apr 2021 – Present", { startDate: "2021-04-01", endDate: null, current: true }],
    ["Aug 2021 - Till date", { startDate: "2021-08-01", endDate: null, current: true }],
    ["2021 till date", { startDate: "2021-01-01", endDate: null, current: true }],
    ["Jun 2023 - Ongoing", { startDate: "2023-06-01", endDate: null, current: true }],
    ["Sept 2020 – Current", { startDate: "2020-09-01", endDate: null, current: true }],
    ["01/2021 - 07/2021", { startDate: "2021-01-01", endDate: "2021-07-01", current: false }],
    ["2019 - 2023", { startDate: "2019-01-01", endDate: "2023-01-01", current: false }],
    ["Jan '20 – Jun '21", { startDate: "2020-01-01", endDate: "2021-06-01", current: false }],
    [
      "Infosys | Mysuru Jul 2017 – Mar 2021",
      { startDate: "2017-07-01", endDate: "2021-03-01", current: false },
    ],
  ])("reads the range %j", (text, expected) => {
    expect(findDates(text)).toMatchObject({ ...expected, range: true });
  });

  it("reads a single date", () => {
    expect(findDates("Python for Everybody (2021)")).toMatchObject({
      startDate: "2021-01-01",
      range: false,
      text: "2021",
    });
  });

  it.each([["Sales and Marketing team"], ["CGPA 8.4/10"], ["Present"], ["13/2020"]])(
    "finds no date in %j",
    (text) => {
      expect(findDates(text)).toBeNull();
    },
  );
});

describe("findGrade", () => {
  it.each([
    ["B.Tech, CGPA: 8.4/10", "CGPA: 8.4/10"],
    ["2019 - 2021 | 8.1 CGPA", "8.1 CGPA"],
    ["12th, 86%", "86%"],
    ["86.5 % in HSC", "86.5 %"],
    ["Secured 9.2/10", "9.2/10"],
    ["B.Tech 2019 - 2023", null],
  ])("%j → %j", (text, expected) => {
    expect(findGrade(text)).toBe(expected);
  });
});

describe("locations", () => {
  it("finds cities by name or alias and states", () => {
    expect(findCity("Bangalore, KA")).toBe("Bengaluru");
    expect(findCity("Flat 4, Kothrud, Pune - 411038")).toBe("Pune");
    expect(findState("Pune, Maharashtra")).toBe("Maharashtra");
    expect(findCity("Remote")).toBeNull();
  });
});

describe("truncate", () => {
  it("cuts at a word boundary", () => {
    expect(truncate("one two three", 9)).toBe("one two");
    expect(truncate("short", 10)).toBe("short");
  });
});
