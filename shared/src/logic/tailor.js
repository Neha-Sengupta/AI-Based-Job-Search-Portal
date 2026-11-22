// Rule-based CV tailoring. It ONLY selects and reorders the user's own
// profile data, so it can't invent anything (product rule 1). Same input → same CV (F7.4).
import { GENERIC_ROLE_WORDS, TAILORING_LIMITS as T } from "../constants/tailoring.js";
import { COUNTRY_OPTIONS } from "../constants/profile.js";
import { matchSkills, skillKey } from "./skills.js";

const words = (text) =>
  (text ?? "")
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .filter(Boolean);
const countryName = (code) =>
  COUNTRY_OPTIONS.find((country) => country.code === code)?.name ?? code;

// Stable sort by score (highest first); ties keep their original order.
const rankBy = (items, score) =>
  items
    .map((item, index) => ({ item, index, score: score(item) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ item }) => item);

function bestTargetRole(roles = [], jobTitle) {
  const titleWords = new Set(words(jobTitle));
  let best = null;
  let bestScore = 0;
  for (const role of roles) {
    const score = words(role).reduce(
      (sum, word) => sum + (titleWords.has(word) ? (GENERIC_ROLE_WORDS.includes(word) ? 1 : 2) : 0),
      0,
    );
    if (score > bestScore) {
      best = role;
      bestScore = score;
    }
  }
  return best;
}

const newestFirst = (a, b) =>
  Number(Boolean(b.current)) - Number(Boolean(a.current)) ||
  (b.startDate ?? "").localeCompare(a.startDate ?? "");

export function tailorCv(profile, job = null, { showPhoto = false } = {}) {
  const requirements = job?.requirements ?? null;
  const mustKeys = (requirements?.mustHave ?? []).map(skillKey);
  const niceKeys = (requirements?.niceToHave ?? []).map(skillKey);
  const jobKeys = new Set([...mustKeys, ...niceKeys]);
  const mentions = (text) =>
    matchSkills(text ?? "").filter((skill) => jobKeys.has(skillKey(skill))).length;
  const changes = [];

  // 1. Skills: must-have matches, then nice-to-have matches, then the rest.
  const skillRank = (skill) => {
    const key = skillKey(skill);
    if (mustKeys.includes(key)) return 2 * jobKeys.size - mustKeys.indexOf(key);
    if (niceKeys.includes(key)) return jobKeys.size - niceKeys.indexOf(key);
    return 0;
  };
  const skills = rankBy(profile.skills ?? [], skillRank).slice(0, T.skills);
  const matchingSkills = skills.filter((skill) => skillRank(skill) > 0).length;
  if (job && matchingSkills)
    changes.push(
      `Moved ${matchingSkills} matching skill${matchingSkills > 1 ? "s" : ""} to the top`,
    );

  // 2. Experience: newest first; bullets that mention the job's skills first.
  const experience = [...(profile.experience ?? [])].sort(newestFirst).map((item, index) => ({
    ...item,
    bullets: rankBy(item.bullets ?? [], mentions).slice(
      0,
      index < T.recentJobs ? T.bulletsRecentJobs : T.bulletsOlderJobs,
    ),
  }));

  // 3. Projects: most relevant first, top 3.
  const projectScore = (project) =>
    2 * (project.skills ?? []).filter((skill) => jobKeys.has(skillKey(skill))).length +
    (project.bullets ?? []).reduce((sum, bullet) => sum + mentions(bullet), 0) +
    mentions(project.description);
  const allProjects = profile.projects ?? [];
  const projects = (job ? rankBy(allProjects, projectScore) : allProjects).slice(0, T.projects);
  if (job && allProjects.length > T.projects)
    changes.push(`Showing your ${T.projects} most relevant projects`);

  // 4. Headline: the target role that best matches the job title, else the profile headline.
  const role = job ? bestTargetRole(profile.preferences?.roles, job.title) : null;
  const headline = role ?? profile.headline ?? null;
  if (role && role !== profile.headline) changes.push(`Headline set to your target role "${role}"`);

  // 6. Must-have skills the profile doesn't have: the UI asks "Do you have…?", never adds them.
  const profileKeys = new Set([
    ...(profile.skills ?? []).map(skillKey),
    ...allProjects.flatMap((project) => (project.skills ?? []).map(skillKey)),
  ]);
  const missingRequirements = (requirements?.mustHave ?? []).filter(
    (skill) => !profileKeys.has(skillKey(skill)),
  );

  const location = [
    profile.location?.city,
    profile.location?.country && countryName(profile.location.country),
  ]
    .filter(Boolean)
    .join(", ");

  return {
    content: {
      basics: {
        fullName: profile.fullName,
        headline,
        email: profile.contactEmail ?? null,
        phone: profile.phone ?? null,
        location: location || null,
        links: profile.links ?? {},
        showPhoto,
      },
      // 5. Unchanged sections.
      summary: profile.summary ?? null,
      skills,
      experience,
      education: profile.education ?? [],
      projects,
      certifications: profile.certifications ?? [],
    },
    missingRequirements,
    changes,
  };
}

// Server check for POST/PATCH /cvs (F7.6): every skill on the CV must exist in the profile.
export function unknownCvSkills(content, profile) {
  const known = new Set([
    ...(profile.skills ?? []).map(skillKey),
    ...(profile.projects ?? []).flatMap((project) => (project.skills ?? []).map(skillKey)),
  ]);
  const cvSkills = [
    ...(content.skills ?? []),
    ...(content.projects ?? []).flatMap((project) => project.skills ?? []),
  ];
  return cvSkills.filter((skill) => !known.has(skillKey(skill)));
}
