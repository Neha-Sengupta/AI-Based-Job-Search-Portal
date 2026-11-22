// Helpers to put realistic data in a test database.
import request from "supertest";
import { Job } from "../modules/jobs/model.js";
import { requirementsFor } from "../modules/jobs/import.js";
import { makeDedupeKey } from "shared/logic/jobs";

let jobCounter = 0;

export async function createJob(overrides = {}) {
  jobCounter += 1;
  const job = {
    source: "test",
    sourceId: `job-${jobCounter}-${Date.now()}`,
    title: "Frontend Developer",
    company: `Company ${jobCounter}`,
    location: { city: "Pune", country: "IN", raw: "Pune, India" },
    workModel: "hybrid",
    jobType: "full_time",
    experienceLevel: "entry",
    description:
      "We want 2+ years with React, JavaScript and CSS. Nice to have: TypeScript. B.Tech preferred.",
    applyUrl: "https://example.com/apply",
    postedAt: new Date(),
    ...overrides,
  };
  return Job.create({
    ...job,
    dedupeKey: makeDedupeKey({ title: job.title, company: job.company, city: job.location.city }),
    requirements:
      "requirements" in overrides ? overrides.requirements : requirementsFor(job.description),
  });
}

export const PROFILE_FIELDS = {
  fullName: "Priya Sharma",
  source: "form",
  headline: "Frontend Developer",
  contactEmail: "priya@example.com",
  location: { city: "Pune", country: "IN" },
  skills: ["React", "JavaScript", "CSS"],
  experience: [
    {
      title: "Developer",
      company: "Acme",
      startDate: "2022-01-01",
      current: true,
      bullets: ["Built 12 React pages"],
    },
  ],
  education: [{ institution: "COEP", degree: "B.Tech", level: "bachelor" }],
  projects: [{ name: "Shop UI", skills: ["React"] }],
  preferences: {
    roles: ["Frontend Developer"],
    workModels: ["hybrid", "remote"],
    countries: ["IN"],
  },
};

export async function createProfile(app, cookie, fields = {}) {
  const res = await request(app)
    .post("/api/v1/profile")
    .set("Cookie", cookie)
    .send({ ...PROFILE_FIELDS, ...fields });
  if (res.status !== 201)
    throw new Error(`Profile create failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data;
}
