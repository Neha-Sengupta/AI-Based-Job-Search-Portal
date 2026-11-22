import { describe, expect, it } from "vitest";
import { cvContentSchema } from "shared/schemas/cv";
import sample from "./__fixtures__/sample-cv.json" with { type: "json" };
import { dateRange, renderCvHtml } from "./render.js";

const PHOTO = "data:image/png;base64,iVBORw0KGgo=";
const TEMPLATE_IDS = ["classic", "modern", "compact"];

const content = (overrides = {}) => cvContentSchema.parse({ ...sample, ...overrides });
const withBasics = (basics) => content({ basics: { ...sample.basics, ...basics } });

describe("renderCvHtml", () => {
  it.each(TEMPLATE_IDS)("%s escapes user text, so a <script> name is never live", (templateId) => {
    const html = renderCvHtml({
      templateId,
      content: withBasics({ fullName: "Priya <script>alert(1)</script>" }),
    });
    expect(html).toContain("Priya &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toMatch(/<script/i);
  });

  it.each(TEMPLATE_IDS)("%s omits empty sections and keeps filled ones", (templateId) => {
    const html = renderCvHtml({
      templateId,
      content: content({ summary: null, projects: [], certifications: [] }),
    });
    expect(html).not.toContain(">Summary<");
    expect(html).not.toContain(">Projects<");
    expect(html).not.toContain(">Certifications<");
    expect(html).toContain(">Experience<");
    expect(html).toContain(">Skills<");
  });

  it.each(TEMPLATE_IDS)("%s shows a current job as running to Present", (templateId) => {
    const html = renderCvHtml({ templateId, content: content() });
    expect(html).toContain("Jul 2024 – Present");
    expect(html).toContain("Jan 2024 – Jun 2024");
  });

  it("shows the photo only for modern, with showPhoto on and a photo given", () => {
    const render = (templateId, showPhoto, photoDataUri) =>
      renderCvHtml({ templateId, content: withBasics({ showPhoto }), photoDataUri });

    expect(render("modern", true, PHOTO)).toContain("<img");
    expect(render("modern", false, PHOTO)).not.toContain("<img");
    expect(render("modern", true, undefined)).not.toContain("<img");
    expect(render("classic", true, PHOTO)).not.toContain("<img");
    expect(render("compact", true, PHOTO)).not.toContain("<img");
  });

  it("rejects an unknown template", () => {
    expect(() => renderCvHtml({ templateId: "fancy", content: content() })).toThrow(
      expect.objectContaining({ code: "VALIDATION_ERROR", message: "Unknown template" }),
    );
  });
});

describe("dateRange", () => {
  it.each([
    ["2022-01-15", null, true, "Jan 2022 – Present"],
    ["2022-01-15", "2023-05-01", false, "Jan 2022 – May 2023"],
    [null, "2020-03-01", false, "Mar 2020"],
    ["2022-01-15", null, false, "Jan 2022"],
    [null, null, false, ""],
  ])("(%s, %s, current=%s) → %j", (start, end, current, expected) => {
    expect(dateRange(start, end, current)).toBe(expected);
  });
});
