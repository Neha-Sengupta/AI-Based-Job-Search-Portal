import { describe, expect, it } from "vitest";
import { calculateFit, verdictFor, yearsOfExperience } from "./fit.js";

const NOW = new Date("2026-11-01T00:00:00Z");

const requirements = {
  mustHave: ["React", "Node.js", "MongoDB", "Docker"],
  niceToHave: ["Kubernetes", "AWS"],
  minYears: 2,
  education: "bachelor",
  workModel: "remote",
  country: "IN",
};

const strongProfile = {
  skills: ["react", "Node", "MongoDB", "docker", "Kubernetes", "AWS"],
  experience: [{ startDate: "2023-01-01", endDate: null, current: true }],
  education: [{ level: "bachelor" }],
  preferences: { workModels: ["remote"], countries: ["IN"] },
};

describe("calculateFit", () => {
  it("is strong with every requirement met (F6.1)", () => {
    const fit = calculateFit(strongProfile, requirements, { now: NOW });
    expect(fit.score).toBeGreaterThanOrEqual(90);
    expect(fit.verdict).toBe("strong");
    expect(fit.missing).toEqual([]);
  });

  it("scores 60 with half the must-haves and no nice-to-haves (F6.2)", () => {
    const profile = { ...strongProfile, skills: ["React", "Node.js"] };
    const fit = calculateFit(profile, requirements, { now: NOW });
    expect(fit.score).toBe(60);
    expect(fit.verdict).toBe("partial");
    expect(fit.missing.slice(0, 2)).toEqual(["MongoDB", "Docker"]);
    expect(fit.breakdown).toEqual({
      mustHave: 50,
      experience: 100,
      niceToHave: 0,
      education: 100,
      location: 100,
    });
  });

  it("is not a fit with no matching skills (F6.3)", () => {
    const profile = {
      ...strongProfile,
      skills: ["Photoshop"],
      education: [],
      experience: [{ startDate: "2026-06-01", current: true }],
    };
    expect(calculateFit(profile, requirements, { now: NOW }).verdict).toBe("not_fit");
  });

  it("matches skills through normalization: JS = JavaScript (F6.4)", () => {
    const fit = calculateFit({ skills: ["JS"] }, { mustHave: ["JavaScript"] }, { now: NOW });
    expect(fit.breakdown.mustHave).toBe(100);
  });

  it("is identical every time (F6.5)", () => {
    expect(calculateFit(strongProfile, requirements, { now: NOW })).toEqual(
      calculateFit(strongProfile, requirements, { now: NOW }),
    );
  });

  it("returns requirements_pending without requirements (F6.6)", () => {
    expect(calculateFit(strongProfile, null)).toEqual({ status: "requirements_pending" });
  });

  it("returns profile_incomplete with no skills and no experience (F6.7)", () => {
    expect(calculateFit({ skills: [], experience: [] }, requirements)).toEqual({
      status: "profile_incomplete",
    });
  });

  it("gives full marks for parts the job doesn't ask for", () => {
    const fit = calculateFit(
      { skills: ["Excel"] },
      {
        mustHave: ["Excel"],
        niceToHave: [],
        minYears: null,
        education: null,
        workModel: "unknown",
      },
    );
    expect(fit.score).toBe(100);
  });

  it("doesn't score a job with no skill requirements (no fake 100%)", () => {
    const requirements = { mustHave: [], niceToHave: [], minYears: 2, education: "bachelor" };
    expect(calculateFit(strongProfile, requirements)).toEqual({ status: "requirements_pending" });
  });

  it("counts project skills and reports missing experience and education", () => {
    const profile = {
      skills: ["React"],
      projects: [{ skills: ["Docker"] }],
      experience: [],
      education: [],
    };
    const fit = calculateFit(
      profile,
      { mustHave: ["React", "Docker"], minYears: 3, education: "master" },
      { now: NOW },
    );
    expect(fit.breakdown.mustHave).toBe(100);
    expect(fit.missing).toEqual(["3+ years of experience", "Master's degree"]);
  });

  it("checks the location against preferences", () => {
    const profile = {
      skills: ["React"],
      preferences: { workModels: ["onsite"], countries: ["IN"] },
    };
    expect(
      calculateFit(profile, { mustHave: ["React"], workModel: "remote" }).breakdown.location,
    ).toBe(0);
    expect(
      calculateFit(profile, { mustHave: ["React"], workModel: "onsite", country: "US" }).breakdown
        .location,
    ).toBe(0);
    expect(
      calculateFit(profile, { mustHave: ["React"], workModel: "onsite", country: "IN" }).breakdown
        .location,
    ).toBe(100);
  });
});

describe("verdictFor (F6.9)", () => {
  it.each([
    [75, "strong"],
    [74, "partial"],
    [50, "partial"],
    [49, "not_fit"],
  ])("%i → %s", (score, verdict) => {
    expect(verdictFor(score)).toBe(verdict);
  });
});

describe("yearsOfExperience", () => {
  it("adds up jobs, counting a current job up to now", () => {
    expect(
      yearsOfExperience(
        [
          { startDate: "2020-11-01", endDate: "2022-11-01" },
          { startDate: "2025-11-01", current: true },
        ],
        NOW,
      ),
    ).toBe(3);
  });
});
