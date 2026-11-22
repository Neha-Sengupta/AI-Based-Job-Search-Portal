// Step 4c: skills, projects, certifications and summary.
import { CV_LAYOUT, PROJECT_NAME_SCORE } from "shared/constants/cv-parser";
import { PROFILE_LIMITS as LIMITS } from "shared/constants/profile";
import { matchSkills, normalizeSkill } from "shared/logic/skills";
import { splitBullets, splitEntries } from "./extract-entries.js";
import { stripBullet } from "./group-lines.js";
import { GITHUB, URL, findDates, truncate, wordCount, withProtocol } from "./patterns.js";

const dedupe = (values) => {
  const seen = new Set();
  return values.filter((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// "/" splits "HTML/CSS" but not short pairs like "CI/CD", "UI/UX" or "PL/SQL".
const splitSlashes = (text) =>
  /^\s*\w{1,3}\s*\/\s*\w{1,3}\s*$/.test(text) ? [text] : text.split("/");

// "Languages: Java, Python | Git" → ["Java", "Python", "Git"].
function skillsOfLine(text) {
  const colon = text.indexOf(":");
  const list = colon >= 0 && wordCount(text.slice(0, colon)) <= 4 ? text.slice(colon + 1) : text;
  return list
    .split(/[,|•;·]/)
    .flatMap(splitSlashes)
    .map((skill) => stripBullet(skill).replace(/\.$/, "").trim())
    .filter((skill) => skill && wordCount(skill) <= CV_LAYOUT.skillMaxWords);
}

export function extractSkills(lines) {
  const skills = lines
    .flatMap((line) => skillsOfLine(line.text))
    .map((skill) => normalizeSkill(skill));
  return dedupe(skills.filter(Boolean)).slice(0, LIMITS.skills);
}

const findUrl = (text) => {
  const url = text.match(URL)?.[0] ?? text.match(GITHUB)?.[0];
  return url ? withProtocol(url) : null;
};
const withoutUrls = (text) =>
  text.replace(new RegExp(URL, "gi"), "").replace(new RegExp(GITHUB, "gi"), "");

// The name: the first bold line, else the first line; text after "|", " – " or "(" is usually the tech stack.
function projectName(headerLines) {
  const scored = headerLines.map((line, i) => ({
    line,
    score: (line.bold ? PROJECT_NAME_SCORE : 0) + (i === 0 ? PROJECT_NAME_SCORE : 0),
  }));
  const top = scored.sort((a, b) => b.score - a.score)[0]?.line;
  const name =
    top &&
    withoutUrls(top.text)
      .split(/\s*[|(]\s*|\s+[–—-]\s+|:\s/)[0]
      .trim();
  return { line: top, name: name || null };
}

export function toProject(lines) {
  const { headerLines, bullets } = splitBullets(lines);
  const { line: nameLine, name } = projectName(headerLines);
  const description = headerLines
    .filter((line) => line !== nameLine)
    .map((line) => withoutUrls(line.text).trim())
    .filter((text) => wordCount(text) > 1)
    .join(" ");
  const text = lines.map((line) => line.text).join("\n");
  return {
    name,
    description: description ? truncate(description, LIMITS.projectDescription) : null,
    bullets,
    skills: dedupe(matchSkills(text, { listContext: false })).slice(0, LIMITS.projectSkills),
    url: lines.map((line) => findUrl(line.text)).find(Boolean) ?? null,
  };
}

export const extractProjects = (lines) => splitEntries(lines).map(toProject);

// One per line or bullet: "AWS Certified Cloud Practitioner – Amazon Web Services (2023)".
export function toCertification(text) {
  const dates = findDates(text);
  const url = findUrl(text);
  const rest = withoutUrls(text)
    .replace(dates?.text ?? "\u0000", " ")
    .replace(/\(\s*\)/g, " ");
  const [name, issuer] = rest
    .split(/\s+[–—-]\s+|\s*\|\s*|,\s+|\s+by\s+/i)
    .map((part) => part.trim())
    .filter((part) => /\p{L}/u.test(part));
  const clean = (part) => part?.replace(/[\s–—:-]+$/, "") || null;
  return { name: clean(name), issuer: clean(issuer), date: dates?.startDate ?? null, url };
}

export function extractCertifications(lines) {
  const texts = [];
  for (const line of lines) {
    const text = stripBullet(line.text);
    // A line that starts lower-case continues the one above it.
    if (texts.length && !line.bullet && /^\p{Ll}/u.test(text))
      texts[texts.length - 1] += ` ${text}`;
    else if (text) texts.push(text);
  }
  return texts.map(toCertification);
}

export function extractSummary(lines) {
  const text = lines
    .map((line) => line.text)
    .join(" ")
    .trim();
  return text ? truncate(text, LIMITS.summary) : null;
}
