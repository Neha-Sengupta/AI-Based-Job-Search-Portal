import { NodeType, parse } from "node-html-parser";

const SKIPPED_TAGS = new Set(["script", "style", "noscript", "template", "head"]);
const BLOCK_TAGS = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "br",
  "dd",
  "div",
  "dl",
  "dt",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "main",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "td",
  "th",
  "tr",
  "ul",
]);
const BULLET = "• ";

function toText(node) {
  if (node.nodeType === NodeType.TEXT_NODE) return node.text.replace(/\s+/g, " ");
  const tag = node.rawTagName?.toLowerCase();
  if (SKIPPED_TAGS.has(tag)) return "";
  const inner = node.childNodes.map(toText).join("");
  if (tag === "li") return `\n${BULLET}${inner.trimStart()}\n`;
  return BLOCK_TAGS.has(tag) ? `\n${inner}\n` : inner;
}

// Job descriptions arrive as HTML (sometimes HTML-escaped HTML, e.g. Greenhouse `content`).
// We store plain text only: one line per block, list items as "• item", entities decoded.
export function htmlToText(html) {
  let source = html ?? "";
  if (!/<[a-z]/i.test(source) && /&lt;[a-z]/i.test(source)) source = parse(source).text;
  return toText(parse(source))
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line && line !== BULLET.trim())
    .join("\n");
}
