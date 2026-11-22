// The fit score: a pure function, no AI and no database.
// Same profile + same job → same result, every time (F6.5).
import { FIT_BANDS, FIT_STATUS, FIT_WEIGHTS } from "../constants/fit.js";
import { EDUCATION_LEVELS, EDUCATION_LEVEL_LABELS } from "../constants/profile.js";
import { skillKey } from "./skills.js";

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

export function verdictFor(score) {
  if (score >= FIT_BANDS.strong) return "strong";
  if (score >= FIT_BANDS.partial) return "partial";
  return "not_fit";
}

// `now` is a parameter so tests are repeatable.
export function yearsOfExperience(experience = [], now = new Date()) {
  const total = experience.reduce((sum, job) => {
    if (!job.startDate) return sum;
    const end = job.current || !job.endDate ? now : new Date(job.endDate);
    return sum + Math.max(0, end - new Date(job.startDate)) / MS_PER_YEAR;
  }, 0);
  // ponytail: overlapping jobs are counted twice; merge date ranges if that ever matters.
  return Math.round(total * 10) / 10;
}

function profileSkillKeys(profile) {
  const keys = new Set((profile.skills ?? []).map(skillKey));
  for (const project of profile.projects ?? [])
    for (const skill of project.skills ?? []) keys.add(skillKey(skill));
  return keys;
}

const share = (have, required) => (required.length === 0 ? 1 : have.length / required.length);
const highestLevel = (education = []) =>
  Math.max(-1, ...education.map((item) => EDUCATION_LEVELS.indexOf(item.level)));

function locationMatches(profile, requirements) {
  const { workModels = [], countries = [] } = profile.preferences ?? {};
  const workModel = requirements.workModel ?? "unknown";
  const workModelOk =
    workModel === "unknown" || workModels.length === 0 || workModels.includes(workModel);
  const countryOk =
    workModel === "remote" ||
    countries.length === 0 ||
    !requirements.country ||
    countries.includes(requirements.country);
  return workModelOk && countryOk;
}

export function isProfileIncomplete(profile) {
  return !profile?.skills?.length && !profile?.experience?.length;
}

// requirements = the job's stored requirements + its workModel and country (built by the jobs service).
export function calculateFit(profile, requirements, { now = new Date() } = {}) {
  // Without any skill requirements the score would be mostly "full marks by default" (a fake 100% for any job),
  // so the fit is shown as pending instead of guessed.
  const noSkills = !requirements?.mustHave?.length && !requirements?.niceToHave?.length;
  if (!requirements || noSkills) return { status: FIT_STATUS.requirementsPending };
  if (isProfileIncomplete(profile)) return { status: FIT_STATUS.profileIncomplete };

  const skills = profileSkillKeys(profile);
  const mustHave = requirements.mustHave ?? [];
  const niceToHave = requirements.niceToHave ?? [];
  const missingMust = mustHave.filter((skill) => !skills.has(skillKey(skill)));
  const missingNice = niceToHave.filter((skill) => !skills.has(skillKey(skill)));

  const years = yearsOfExperience(profile.experience, now);
  const experienceShare = requirements.minYears ? Math.min(1, years / requirements.minYears) : 1;

  const requiredLevel = requirements.education
    ? EDUCATION_LEVELS.indexOf(requirements.education)
    : -1;
  const educationOk = requiredLevel < 0 || highestLevel(profile.education) >= requiredLevel;

  const parts = {
    mustHave: share(
      mustHave.filter((skill) => !missingMust.includes(skill)),
      mustHave,
    ),
    experience: experienceShare,
    niceToHave: share(
      niceToHave.filter((skill) => !missingNice.includes(skill)),
      niceToHave,
    ),
    education: educationOk ? 1 : 0,
    location: locationMatches(profile, requirements) ? 1 : 0,
  };

  const breakdown = Object.fromEntries(
    Object.entries(parts).map(([part, value]) => [part, Math.round(value * 100)]),
  );
  const score = Math.round(
    Object.entries(parts).reduce((sum, [part, value]) => sum + value * FIT_WEIGHTS[part], 0),
  );

  const missing = [
    ...missingMust,
    ...(experienceShare < 1 ? [`${requirements.minYears}+ years of experience`] : []),
    ...(educationOk ? [] : [`${EDUCATION_LEVEL_LABELS[requirements.education]} degree`]),
    ...missingNice,
  ];

  return {
    score,
    verdict: verdictFor(score),
    breakdown,
    missing,
    missingSkills: [...missingMust, ...missingNice],
  };
}
