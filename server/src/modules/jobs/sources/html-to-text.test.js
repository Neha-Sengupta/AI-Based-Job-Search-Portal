import { describe, expect, it } from "vitest";
import { htmlToText } from "./html-to-text.js";

describe("htmlToText", () => {
  it("keeps one line per block and list items as bullets", () => {
    const html =
      "<div><h3>About us</h3><p>We build   things.</p><ul><li>Node.js</li><li><strong>React</strong> &amp; Next.js</li></ul></div>";
    expect(htmlToText(html)).toBe("About us\nWe build things.\n• Node.js\n• React & Next.js");
  });

  it("decodes HTML-escaped HTML (Greenhouse content)", () => {
    expect(
      htmlToText(
        "&lt;p&gt;Hello&amp;nbsp;world&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Go&lt;/li&gt;&lt;/ul&gt;",
      ),
    ).toBe("Hello world\n• Go");
  });

  it("drops scripts, styles and empty blocks", () => {
    expect(
      htmlToText("<style>p{}</style><p> </p><script>alert(1)</script><p>Text<br>more</p>"),
    ).toBe("Text\nmore");
  });

  it("returns an empty string for empty input", () => {
    expect(htmlToText(null)).toBe("");
    expect(htmlToText("plain text")).toBe("plain text");
  });
});
