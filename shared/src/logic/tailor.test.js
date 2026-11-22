import { describe, expect, it } from "vitest";
import { tailorCv, unknownCvSkills } from "./tailor.js";

const profile = {
  fullName: "Priya Sharma",
  headline: "Software Developer",
  contactEmail: "priya@example.com",
  location: { city: "Pune", country: "IN" },
  links: { github: "https://github.com/priya" },
  summary: "Developer who likes data and the web.",
  skills: ["CSS", "React", "Python", "PyTorch", "Node.js", "Pandas"],
  experience: [
    {
      title: "Intern",
      company: "Old Co",
      startDate: "2022-01-01",
      endDate: "2022-06-01",
      bullets: ["Wrote docs"],
    },
    {
      title: "Developer",
      company: "New Co",
      startDate: "2023-01-01",
      current: true,
      bullets: [
        "Built React dashboards",
        "Trained a PyTorch model to tag tickets",
        "Ran stand-ups",
      ],
    },
  ],
  education: [{ institution: "COEP", level: "bachelor" }],
  projects: [
    { name: "Shop UI", skills: ["React", "CSS"] },
    { name: "Ticket classifier", skills: ["Python", "PyTorch"] },
    { name: "Blog", skills: ["Node.js"] },
    { name: "Data notebook", skills: ["Pandas"] },
  ],
  preferences: { roles: ["AI/ML Developer", "Web Developer"] },
};

const mlJob = {
  title: "AI/ML Engineer",
  requirements: { mustHave: ["Python", "PyTorch", "Kubernetes"], niceToHave: ["Pandas"] },
};
const webJob = {
  title: "Frontend Web Developer",
  requirements: { mustHave: ["React", "CSS"], niceToHave: [] },
};

describe("tailorCv", () => {
  it("puts ML first and uses the AI/ML target role for an ML job (F7.1)", () => {
    const { content, changes } = tailorCv(profile, mlJob);
    expect(content.basics.headline).toBe("AI/ML Developer");
    expect(content.skills.slice(0, 3)).toEqual(["Python", "PyTorch", "Pandas"]);
    expect(content.projects[0].name).toBe("Ticket classifier");
    expect(content.experience[0].company).toBe("New Co");
    expect(content.experience[0].bullets[0]).toBe("Trained a PyTorch model to tag tickets");
    expect(changes).toContain('Headline set to your target role "AI/ML Developer"');
  });

  it("puts web first and uses the Web Developer role for a web job (F7.2)", () => {
    const { content } = tailorCv(profile, webJob);
    expect(content.basics.headline).toBe("Web Developer");
    expect(content.skills.slice(0, 2)).toEqual(["React", "CSS"]);
    expect(content.projects[0].name).toBe("Shop UI");
  });

  it("only uses facts from the profile (F7.3)", () => {
    const { content } = tailorCv(profile, mlJob);
    expect(unknownCvSkills(content, profile)).toEqual([]);
    expect(content.skills).not.toContain("Kubernetes");
    for (const job of content.experience) {
      expect(
        profile.experience.some((item) => item.company === job.company && item.title === job.title),
      ).toBe(true);
    }
  });

  it("is identical when run twice (F7.4)", () => {
    expect(tailorCv(profile, mlJob)).toEqual(tailorCv(profile, mlJob));
  });

  it("lists missing must-have skills instead of adding them (F7.5)", () => {
    expect(tailorCv(profile, mlJob).missingRequirements).toEqual(["Kubernetes"]);
  });

  it("makes a general CV without a job", () => {
    const { content, missingRequirements, changes } = tailorCv(profile, null, { showPhoto: true });
    expect(content.basics).toMatchObject({
      headline: "Software Developer",
      location: "Pune, India",
      showPhoto: true,
    });
    expect(content.skills).toEqual(profile.skills);
    expect(missingRequirements).toEqual([]);
    expect(changes).toEqual([]);
  });
});

describe("unknownCvSkills (F7.6)", () => {
  it("finds skills that aren't in the profile", () => {
    expect(unknownCvSkills({ skills: ["React", "Rust"], projects: [] }, profile)).toEqual(["Rust"]);
    expect(unknownCvSkills({ skills: ["reactjs"], projects: [] }, profile)).toEqual([]);
  });
});
