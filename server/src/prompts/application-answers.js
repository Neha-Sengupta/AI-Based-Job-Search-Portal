// Application kit answers (F10). Only the fields this task needs: no photo, no email or phone.
import { z } from "zod";
import { APPLICATION_LIMITS as L } from "shared/constants/applications";

const JOB_DESCRIPTION_CHARS = 4000;

export const TRUTHFULNESS =
  "Use only the facts provided. Never add skills, employers, job titles, dates, degrees, certifications or numbers that are not in the input. You may reorder, rephrase and emphasise.";

export const SYSTEM = `You help a job seeker in India write short, honest answers to job application questions. ${TRUTHFULNESS} Write in first person, plain English, 60–150 words per answer. If the profile doesn't support a claim, leave it out.`;

export const outputSchema = z.object({
  answers: z
    .array(
      z.object({
        question: z.string().trim().min(1).max(L.question),
        answer: z.string().trim().min(1).max(L.answer),
      }),
    )
    .min(1)
    .max(L.answers),
});

// The reply shape shown to the model (lib/ai.js formatInstruction); outputSchema is what's enforced.
export const outputExample = {
  answers: [{ question: "The question, exactly as given", answer: "Your answer to it" }],
};

export function buildPrompt({ profile, job, questions }) {
  const facts = {
    name: profile.fullName,
    headline: profile.headline,
    summary: profile.summary,
    skills: profile.skills,
    experience: profile.experience.map(
      ({ title, company, startDate, endDate, current, bullets }) => ({
        title,
        company,
        startDate,
        endDate,
        current,
        bullets,
      }),
    ),
    education: profile.education.map(({ institution, degree, field, level }) => ({
      institution,
      degree,
      field,
      level,
    })),
    projects: profile.projects.map(({ name, description, bullets, skills }) => ({
      name,
      description,
      bullets,
      skills,
    })),
  };
  return [
    "PROFILE (the only facts you may use about the candidate):",
    JSON.stringify(facts),
    "",
    `JOB: ${job.title} at ${job.company}`,
    job.description.slice(0, JOB_DESCRIPTION_CHARS),
    "",
    "Answer each of these questions, keeping each question text exactly as given:",
    ...questions.map((question, index) => `${index + 1}. ${question}`),
  ].join("\n");
}
