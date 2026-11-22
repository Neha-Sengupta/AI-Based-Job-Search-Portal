// Turns saved CV content into a self-contained HTML document.
// User text reaches the HTML only through Handlebars {{ }}, which escapes it.
import { readFileSync } from "node:fs";
import Handlebars from "handlebars";
import { EDUCATION_LEVEL_LABELS } from "shared/constants/profile";
import { TEMPLATES } from "shared/constants/templates";
import { AppError } from "../../lib/errors.js";

const TEMPLATE_DIR = new URL("./templates/", import.meta.url);
const PRESENT = "Present";
const DATE_SEPARATOR = " – ";

// Read once at start-up (no sync file reads during requests); each is compiled on first use.
const SOURCES = new Map(
  TEMPLATES.map((template) => [
    template.id,
    readFileSync(new URL(`${template.id}.hbs`, TEMPLATE_DIR), "utf8"),
  ]),
);

const handlebars = Handlebars.create();
const compiled = new Map();

// "2022-01-15" → "Jan 2022"
export function formatDate(isoDate) {
  if (!isoDate) return "";
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function dateRange(startDate, endDate, current) {
  const end = current === true ? PRESENT : formatDate(endDate);
  return [formatDate(startDate), end].filter(Boolean).join(DATE_SEPARATOR);
}

// "https://www.linkedin.com/in/priya/" → "linkedin.com/in/priya": links are printed as text.
export function displayUrl(url) {
  if (!url) return "";
  return url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
}

const hasItems = (list) => Array.isArray(list) && list.length > 0;

// Handlebars passes its options object as the last argument, so a missing separator arrives as an object.
const join = (list, separator) =>
  hasItems(list) ? list.join(typeof separator === "string" ? separator : ", ") : "";

handlebars.registerHelper({
  formatDate,
  dateRange,
  displayUrl,
  join,
  hasItems,
  educationLevel: (level) => EDUCATION_LEVEL_LABELS[level] ?? "",
});

function getTemplate(templateId) {
  const template = TEMPLATES.find((item) => item.id === templateId);
  if (!template) throw new AppError("VALIDATION_ERROR", "Unknown template");
  if (!compiled.has(templateId))
    compiled.set(templateId, handlebars.compile(SOURCES.get(templateId)));
  return { render: compiled.get(templateId), supportsPhoto: template.supportsPhoto };
}

function contactLine(basics) {
  const { linkedin, github, portfolio } = basics.links ?? {};
  return [
    basics.email,
    basics.phone,
    basics.location,
    displayUrl(linkedin),
    displayUrl(github),
    displayUrl(portfolio),
  ].filter(Boolean);
}

// content must already be parsed with cvContentSchema.
export function renderCvHtml({ templateId, content, photoDataUri }) {
  const { render, supportsPhoto } = getTemplate(templateId);
  const showPhoto = supportsPhoto && content.basics.showPhoto === true && Boolean(photoDataUri);
  return render({
    ...content,
    contact: contactLine(content.basics),
    photoDataUri: showPhoto ? photoDataUri : null,
  });
}
