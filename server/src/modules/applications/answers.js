// POST /applications/:id/answers: AI-drafted application answers, saved on the application (F10).
import { APPLICATION_LIMITS, DEFAULT_KIT_QUESTIONS } from "shared/constants/applications";
import { matchSkills, skillKey } from "shared/logic/skills";
import { AppError } from "../../lib/errors.js";
import { chatJson } from "../../lib/ai.js";
import { logger } from "../../lib/logger.js";
import {
  buildPrompt,
  outputExample,
  outputSchema,
  SYSTEM,
} from "../../prompts/application-answers.js";
import { Job } from "../jobs/model.js";
import { findProfile, toProfileDto } from "../profile/service.js";
import { Application } from "./model.js";
import { requireApplication } from "./service.js";

// Code-level guard: drop any answer that names a skill found in neither the profile nor the job.
export function withoutInventedSkills(answers, profile, jobText) {
  const allowed = new Set([
    ...(profile.skills ?? []).map(skillKey),
    ...(profile.projects ?? []).flatMap((project) => (project.skills ?? []).map(skillKey)),
    ...matchSkills(jobText).map(skillKey),
  ]);
  return answers.filter(({ question, answer }) => {
    const invented = matchSkills(answer).filter((skill) => !allowed.has(skillKey(skill)));
    if (invented.length)
      logger.warn(
        { question, invented },
        "Dropped an AI answer that named skills not in the profile or job",
      );
    return invented.length === 0;
  });
}

export async function draftAnswers(userId, applicationId, { questions, regenerate }) {
  const application = await requireApplication(userId, applicationId);
  const custom = Boolean(questions?.length);

  // Saved answers are returned without an AI call (F10.4).
  if (!custom && !regenerate && application.answers.length) return { answers: application.answers };
  if (custom && application.answers.length + questions.length > APPLICATION_LIMITS.answers) {
    throw new AppError(
      "CONFLICT",
      `You can keep up to ${APPLICATION_LIMITS.answers} answers. Delete some first.`,
    );
  }

  const profileDoc = await findProfile(userId);
  if (!profileDoc) throw new AppError("NOT_FOUND", "Create your profile first.");
  const profile = toProfileDto(profileDoc);
  const job = (await Job.findById(application.jobId)
    .select("title company description")
    .lean()) ?? {
    ...application.job,
    description: "",
  };

  const asked = custom ? questions : DEFAULT_KIT_QUESTIONS;
  const { answers } = await chatJson({
    userId,
    task: "application-answers",
    system: SYSTEM,
    prompt: buildPrompt({ profile, job, questions: asked }),
    schema: outputSchema,
    example: outputExample,
  });
  const generatedAt = new Date();
  const checked = withoutInventedSkills(answers, profile, job.description).map((item) => ({
    ...item,
    generatedAt,
  }));
  if (!checked.length)
    throw new AppError("AI_FAILED", "We couldn't draft a reliable answer. Please try again.");

  const saved = custom ? [...application.answers, ...checked] : checked;
  await Application.updateOne({ _id: application._id, userId }, { $set: { answers: saved } });
  return { answers: saved };
}
