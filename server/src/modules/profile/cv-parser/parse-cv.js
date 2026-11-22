// Runs the CV parser steps and collects warnings. Pure: never touches the database.
import {
  CV_DRAFT_FIELD_LABELS,
  CV_MIME_TYPES,
  CV_PARSER_MESSAGES,
} from "shared/constants/cv-parser";
import { profileDraftFieldSchemas } from "shared/schemas/profile";
import { AppError } from "../../../lib/errors.js";
import { extractHeader } from "./extract-header.js";
import { splitEntries, toEducation, toExperience } from "./extract-entries.js";
import {
  extractCertifications,
  extractProjects,
  extractSkills,
  extractSummary,
} from "./extract-lists.js";
import { findSections } from "./find-sections.js";
import { groupLines } from "./group-lines.js";
import { readDocx } from "./read-docx.js";
import { readPdf } from "./read-pdf.js";

const isEmpty = (value) =>
  value === null ||
  value === undefined ||
  value === "" ||
  (Array.isArray(value) && value.length === 0) ||
  (typeof value === "object" && !Array.isArray(value) && Object.values(value).every(isEmpty));

// Each top-level field is validated on its own, and list items one by one, so one bad value is dropped with a
// warning instead of failing the whole upload (step 5).
function validateDraft(raw, warnings) {
  const draft = {};
  for (const [field, schema] of Object.entries(profileDraftFieldSchemas)) {
    let value = raw[field];
    if (isEmpty(value)) continue;
    if (Array.isArray(value) && schema.element) {
      const valid = value.filter((item) => schema.element.safeParse(item).success);
      if (valid.length < value.length) {
        warnings.push(
          CV_PARSER_MESSAGES.skippedEntries(
            value.length - valid.length,
            CV_DRAFT_FIELD_LABELS[field],
          ),
        );
      }
      if (!valid.length) continue;
      value = valid;
    }
    const result = schema.safeParse(value);
    if (result.success) draft[field] = result.data;
    else warnings.push(CV_PARSER_MESSAGES.invalidField(CV_DRAFT_FIELD_LABELS[field]));
  }
  if (!draft.contactEmail) warnings.push(CV_PARSER_MESSAGES.noEmail);
  return draft;
}

// Lines (from read-docx, or from read-pdf + group-lines) → { draft, warnings }.
export function buildDraft(lines, { twoColumns = false } = {}) {
  if (!lines.some((line) => /[\p{L}\d]/u.test(line.text))) {
    throw new AppError("VALIDATION_ERROR", CV_PARSER_MESSAGES.unreadable);
  }
  const warnings = twoColumns ? [CV_PARSER_MESSAGES.twoColumns] : [];
  const { header, sections } = findSections(lines);
  for (const section of sections) {
    if (section.name === null) warnings.push(CV_PARSER_MESSAGES.unknownSection(section.title));
  }
  // Each section is read on its own, so an "Internship" entry never merges with a "Work Experience" one.
  const each = (name, read) =>
    sections.filter((section) => section.name === name).flatMap((section) => read(section.lines));
  const entries = (name, toEntry) =>
    each(name, (sectionLines) => splitEntries(sectionLines).map(toEntry));

  const experience = entries("experience", toExperience);
  const undated = experience.filter((job) => job.title && job.company && !job.startDate).length;
  if (undated) warnings.push(CV_PARSER_MESSAGES.noDates(undated));

  // Ignored sections (declaration, personal details…) never reach any extractor.
  const searchable = [
    ...header,
    ...sections
      .filter((section) => section.name && section.name !== "ignored")
      .flatMap((s) => s.lines),
  ];
  const raw = {
    ...extractHeader(header, searchable),
    summary: extractSummary(each("summary", (sectionLines) => sectionLines)),
    skills: extractSkills(each("skills", (sectionLines) => sectionLines)),
    experience: experience.filter((job) => job.startDate || !(job.title && job.company)),
    education: entries("education", toEducation),
    projects: each("projects", extractProjects),
    certifications: each("certifications", extractCertifications),
  };
  return { draft: validateDraft(raw, warnings), warnings };
}

export async function parseCv({ buffer, mimeType }) {
  if (mimeType === CV_MIME_TYPES.pdf) {
    const { lines, twoColumns } = groupLines(await readPdf(buffer));
    return buildDraft(lines, { twoColumns });
  }
  if (mimeType === CV_MIME_TYPES.docx) return buildDraft(await readDocx(buffer));
  throw new AppError("UNSUPPORTED_FILE_TYPE", CV_PARSER_MESSAGES.unsupported);
}
