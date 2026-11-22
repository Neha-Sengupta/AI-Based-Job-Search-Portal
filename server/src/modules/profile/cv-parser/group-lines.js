// Step 2 (PDF only): text items → lines.
import { BULLET_CHARS, CV_LAYOUT } from "shared/constants/cv-parser";

// "•Built" or "- Built" or "1. Built" or "a) Built". Dash-like characters need a space after them ("-5%" isn't a bullet).
const BULLET = new RegExp(
  `^(?:[${BULLET_CHARS.filter((char) => !"-*–".includes(char)).join("")}]\\s*|[-*–]\\s+|(?:\\d{1,2}|[a-z])[.)]\\s+)`,
);
const YEAR = /\b(?:19|20)\d{2}\b/;

export const stripBullet = (text) => text.replace(BULLET, "").trim();

export function makeLine({
  text,
  bold = false,
  heading = false,
  bullet = false,
  x = null,
  y = null,
  height = null,
  itemCount = 1,
  page = null,
}) {
  const clean = text.replace(/\s+/g, " ").trim();
  return {
    text: clean,
    x,
    y,
    height,
    bold,
    heading,
    allCaps: /[A-Z]/.test(clean) && clean === clean.toUpperCase(),
    bullet: bullet || BULLET.test(clean),
    itemCount,
    page,
  };
}

// Total width ÷ total characters, over non-bold items (bold glyphs are wider).
export function averageCharWidth(items) {
  const plain = items.some((item) => item.bold !== true)
    ? items.filter((item) => item.bold !== true)
    : items;
  const chars = plain.reduce((sum, item) => sum + item.text.length, 0);
  return chars ? plain.reduce((sum, item) => sum + item.width, 0) / chars : 0;
}

// Items whose y values are within half a line height of each other form one row, sorted by x.
function toRows(items) {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows = [];
  for (const item of sorted) {
    const row = rows.at(-1);
    if (row && Math.abs(item.y - row[0].y) <= Math.max(item.height, row[0].height) / 2) {
      row.push(item);
    } else {
      rows.push([item]);
    }
  }
  return rows.map((row) => row.sort((a, b) => a.x - b.x));
}

// Neighbouring items closer than the average character width are fragments of the same piece of text.
function toPieces(row, charWidth) {
  const pieces = [];
  for (const item of row) {
    const piece = pieces.at(-1);
    const gap = piece ? item.x - piece.end : Infinity;
    if (gap < charWidth) {
      const needsSpace = gap > charWidth / 5 && !/\s$/.test(piece.text) && !/^\s/.test(item.text);
      piece.text += (needsSpace ? " " : "") + item.text;
      piece.end = item.x + item.width;
    } else {
      pieces.push({ text: item.text, x: item.x, end: item.x + item.width });
    }
  }
  return pieces;
}

function rowToLine(row, charWidth) {
  const pieces = toPieces(row, charWidth);
  return makeLine({
    text: pieces.map((piece) => piece.text).join(" "),
    x: row[0].x,
    y: row[0].y,
    height: Math.max(...row.map((item) => item.height)),
    bold: row.every((item) => item.bold === true),
    itemCount: pieces.length,
    page: row[0].page,
  });
}

// Two columns: many rows have a wide gap after which text starts at the same x.
// Gaps next to a date don't count: a right-aligned or left-gutter date is part of a single-column line.
export function findColumnX(items, charWidth) {
  const rows = toRows(items);
  const starts = new Map();
  for (const row of rows) {
    const pieces = toPieces(row, charWidth);
    for (let i = 1; i < pieces.length; i++) {
      const wide = pieces[i].x - pieces[i - 1].end >= charWidth * CV_LAYOUT.columnGapChars;
      if (!wide || YEAR.test(pieces[i].text) || YEAR.test(pieces[i - 1].text)) continue;
      const key = Math.round(pieces[i].x / CV_LAYOUT.columnTolerance);
      starts.set(key, [...(starts.get(key) ?? []), pieces[i].x]);
    }
  }
  const [best = []] = [...starts.values()].sort((a, b) => b.length - a.length);
  const needed = Math.max(CV_LAYOUT.twoColumnMinLines, rows.length * CV_LAYOUT.twoColumnMinShare);
  return best.length >= needed ? Math.min(...best) : null;
}

// ponytail: the spec only asks for a warning; reading each column on its own fixes most sidebar CVs.
// Column order: the one holding the biggest text (usually the name) first.
function splitColumns(items, columnX) {
  const edge = columnX - CV_LAYOUT.columnTolerance;
  const left = items.filter((item) => item.x < edge);
  const right = items.filter((item) => item.x >= edge);
  const tallest = (column) => Math.max(...column.map((item) => item.height));
  return tallest(right) > tallest(left) ? [right, left] : [left, right];
}

export function groupLines(items) {
  const charWidth = averageCharWidth(items);
  const columnX = findColumnX(items, charWidth);
  const columns = columnX === null ? [items] : splitColumns(items, columnX);
  const lines = columns.flatMap((column) => toRows(column).map((row) => rowToLine(row, charWidth)));
  return { lines, twoColumns: columnX !== null };
}
