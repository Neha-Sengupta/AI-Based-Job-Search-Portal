import { describe, expect, it } from "vitest";
import { calculateCompleteness } from "./completeness.js";
import { getProfileTips } from "./tips.js";

const complete = {
  fullName: "Priya Sharma",
  headline: "Frontend Developer",
  contactEmail: "priya@example.com",
  phone: "+91 98765 43210",
  location: { city: "Pune", country: "IN" },
  links: { github: "https://github.com/priya" },
  summary:
    "Frontend developer with 2 years of experience building fast, accessible React apps for fintech and e-commerce startups in Pune. Looking for a product team.",
  skills: ["React", "JavaScript", "CSS", "Node.js", "Git"],
  experience: [
    {
      company: "Acme",
      title: "Developer",
      bullets: ["Cut page load time by 40%", "Built 12 reusable components"],
    },
  ],
  education: [],
  projects: [{ name: "Budget app", skills: ["React"] }],
  preferences: { roles: ["Frontend Developer"] },
};

describe("calculateCompleteness", () => {
  it("is 100 for a full profile (F3.1)", () => {
    expect(calculateCompleteness(complete)).toEqual({
      percent: 100,
      missingRequired: [],
      missingRecommended: [],
    });
  });

  it("lists missing recommended fields (F3.2)", () => {
    const result = calculateCompleteness({ ...complete, summary: "", projects: [] });
    expect(result.missingRecommended).toEqual(["summary", "projects"]);
    expect(result.percent).toBe(88);
  });

  it.each([
    [{}, 0],
    [{ fullName: "A" }, 12],
    [{ ...complete, skills: ["React", "CSS"] }, 88],
    [{ ...complete, experience: [], education: [] }, 88],
  ])("profile %# scores %i", (profile, percent) => {
    expect(calculateCompleteness(profile).percent).toBe(percent);
  });

  it("is identical when calculated twice (F3.3)", () => {
    expect(calculateCompleteness(complete)).toEqual(calculateCompleteness(complete));
  });
});

describe("getProfileTips", () => {
  it("has no tips for a strong profile", () => {
    expect(getProfileTips(complete)).toEqual([]);
  });

  it("points at the bullets of the job with no numbers (F3.5)", () => {
    const profile = {
      ...complete,
      experience: [
        complete.experience[0],
        { company: "Beta", title: "Intern", bullets: ["Fixed bugs", "Wrote tests"] },
      ],
    };
    expect(getProfileTips(profile)).toEqual([
      {
        id: "measurable-results",
        field: "experience.1.bullets",
        tip: "Your bullets at Beta have no measurable results. Add a number, a percentage or the time you saved.",
      },
    ]);
    expect(getProfileTips(profile)).toEqual(getProfileTips(profile));
  });

  it("gives the basics tips for an empty profile, in a stable order", () => {
    expect(getProfileTips({ fullName: "A" }).map((tip) => tip.id)).toEqual([
      "headline",
      "summary",
      "skills",
      "projects",
      "links",
      "target-roles",
    ]);
  });
});
