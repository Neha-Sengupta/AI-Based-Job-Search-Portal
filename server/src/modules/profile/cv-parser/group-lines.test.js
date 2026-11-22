import { describe, expect, it } from "vitest";
import { groupLines, makeLine, stripBullet } from "./group-lines.js";
import twoColumnItems from "./__fixtures__/two-column.items.json" with { type: "json" };
import fresherItems from "./__fixtures__/fresher-btech.items.json" with { type: "json" };

const item = (text, x, y, { width = text.length * 5, height = 10, bold = false } = {}) => ({
  text,
  x,
  y,
  width,
  height,
  bold,
  page: 1,
});

describe("makeLine", () => {
  it.each([
    ["• Built an API", true],
    ["●Built an API", true],
    ["- Built an API", true],
    ["* Built an API", true],
    ["– Built an API", true],
    ["1. Built an API", true],
    ["a) Built an API", true],
    ["-5% churn", false],
    ["Built an API", false],
  ])("%j is a bullet: %s", (text, bullet) => {
    expect(makeLine({ text }).bullet).toBe(bullet);
  });

  it("flags all-caps lines and squashes spaces", () => {
    expect(makeLine({ text: "  WORK   EXPERIENCE " })).toMatchObject({
      text: "WORK EXPERIENCE",
      allCaps: true,
    });
    expect(makeLine({ text: "2019 - 2023" }).allCaps).toBe(false);
  });

  it("strips bullet markers", () => {
    expect(stripBullet("• Built an API")).toBe("Built an API");
    expect(stripBullet("2. Built an API")).toBe("Built an API");
  });
});

describe("groupLines", () => {
  it("merges fragments of one word or number and sorts by x", () => {
    const { lines } = groupLines([
      item("43210", 80, 10),
      item("+91 98765 ", 30, 10.5),
      item("Next line", 30, 25),
    ]);
    expect(lines.map((line) => line.text)).toEqual(["+91 98765 43210", "Next line"]);
    expect(lines[0].itemCount).toBe(1);
  });

  it("keeps far-apart pieces separate and marks a line bold only if every item is bold", () => {
    const { lines } = groupLines([
      item("Software Engineer", 30, 10, { bold: true }),
      item("Jan 2020 – Present", 400, 10),
    ]);
    expect(lines[0]).toMatchObject({
      text: "Software Engineer Jan 2020 – Present",
      itemCount: 2,
      bold: false,
    });
  });

  it("detects a two-column CV and reads each column on its own", () => {
    const { lines, twoColumns } = groupLines(twoColumnItems);
    expect(twoColumns).toBe(true);
    const texts = lines.map((line) => line.text);
    expect(texts[0]).toBe("Kavya Nair");
    expect(texts).toContain("CONTACT");
    expect(texts.every((text) => !text.includes("SKILLS Junior"))).toBe(true);
  });

  it("doesn't mistake right-aligned dates for a second column", () => {
    expect(groupLines(fresherItems).twoColumns).toBe(false);
  });
});
