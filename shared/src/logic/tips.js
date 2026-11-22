// Rule-based improvement tips (no AI): the same profile always gets the same tips (F3.5).
import { TIP_THRESHOLDS as T } from "../constants/tips.js";

const filled = (value) => typeof value === "string" && value.trim().length > 0;
const hasNumber = (text) => /\d/.test(text);

// Each rule returns a list of { field, tip } (empty when the rule doesn't apply). Order = display order.
const RULES = [
  {
    id: "headline",
    check: (p) =>
      filled(p.headline)
        ? []
        : [
            {
              field: "headline",
              tip: 'Add a headline, like "Frontend Developer" or "Final-year B.Tech student".',
            },
          ],
  },
  {
    id: "summary",
    check: (p) => {
      if (!filled(p.summary)) {
        return [
          {
            field: "summary",
            tip: "Add a 2–3 sentence summary: who you are, your main skills and the role you want.",
          },
        ];
      }
      return p.summary.trim().length < T.minSummaryLength
        ? [
            {
              field: "summary",
              tip: "Your summary is short. Mention your main skills and the kind of role you want.",
            },
          ]
        : [];
    },
  },
  {
    id: "measurable-results",
    check: (p) =>
      (p.experience ?? [])
        .map((job, index) => ({ job, index }))
        .filter(({ job }) => job.bullets?.length > 0 && !job.bullets.some(hasNumber))
        .slice(0, T.maxTipsPerRule)
        .map(({ job, index }) => ({
          field: `experience.${index}.bullets`,
          tip: `Your bullets at ${job.company} have no measurable results. Add a number, a percentage or the time you saved.`,
        })),
  },
  {
    id: "few-bullets",
    check: (p) =>
      (p.experience ?? [])
        .map((job, index) => ({ job, index }))
        .filter(({ job }) => (job.bullets?.length ?? 0) < T.minBulletsPerJob)
        .slice(0, T.maxTipsPerRule)
        .map(({ job, index }) => ({
          field: `experience.${index}.bullets`,
          tip: `Add at least ${T.minBulletsPerJob} bullet points about what you did at ${job.company}.`,
        })),
  },
  {
    id: "skills",
    check: (p) =>
      (p.skills?.length ?? 0) < T.minSkills
        ? [
            {
              field: "skills",
              tip: `Add at least ${T.minSkills} skills so we can match you to more jobs.`,
            },
          ]
        : [],
  },
  {
    id: "projects",
    check: (p) =>
      (p.projects?.length ?? 0) === 0
        ? [
            {
              field: "projects",
              tip: "Add a project. It's the best way to show your skills, especially as a fresher.",
            },
          ]
        : [],
  },
  {
    id: "project-skills",
    check: (p) =>
      (p.projects ?? [])
        .map((project, index) => ({ project, index }))
        .filter(({ project }) => (project.skills?.length ?? 0) === 0)
        .slice(0, T.maxTipsPerRule)
        .map(({ project, index }) => ({
          field: `projects.${index}.skills`,
          tip: `List the skills you used in "${project.name}".`,
        })),
  },
  {
    id: "links",
    check: (p) =>
      ["linkedin", "github", "portfolio"].some((key) => filled(p.links?.[key]))
        ? []
        : [{ field: "links", tip: "Add your LinkedIn or GitHub link. Recruiters look for them." }],
  },
  {
    id: "target-roles",
    check: (p) =>
      (p.preferences?.roles?.length ?? 0) === 0
        ? [
            {
              field: "preferences.roles",
              tip: "Add the roles you're looking for to get better job recommendations.",
            },
          ]
        : [],
  },
];

export function getProfileTips(profile = {}) {
  return RULES.flatMap((rule) => rule.check(profile).map((tip) => ({ id: rule.id, ...tip })));
}
