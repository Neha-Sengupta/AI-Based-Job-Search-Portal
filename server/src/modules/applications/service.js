import { AppError } from "../../lib/errors.js";
import { Job } from "../jobs/model.js";
import { Cv } from "../cvs/model.js";
import { Application } from "./model.js";

export const toApplicationDto = (application, jobAvailable = true) => ({
  id: String(application._id),
  jobId: String(application.jobId),
  job: application.job,
  jobAvailable,
  cvId: application.cvId ? String(application.cvId) : null,
  cvDeleted: Boolean(application.cvDeleted),
  status: application.status,
  history: application.history,
  notes: application.notes ?? "",
  answers: application.answers ?? [],
  createdAt: application.createdAt,
  updatedAt: application.updatedAt,
});

async function checkCv(userId, cvId) {
  if (cvId && !(await Cv.exists({ _id: cvId, userId })))
    throw new AppError("NOT_FOUND", "CV not found.");
}

export async function listApplications(userId, { status, page, limit }) {
  const filter = { userId, ...(status && { status: { $in: status } }) };
  const [applications, total] = await Promise.all([
    Application.find(filter)
      .select("-answers")
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Application.countDocuments(filter),
  ]);
  const liveJobs = new Set(
    (
      await Job.find({ _id: { $in: applications.map((item) => item.jobId) } })
        .select("_id")
        .lean()
    ).map((job) => String(job._id)),
  );
  return {
    data: applications.map((item) => toApplicationDto(item, liveJobs.has(String(item.jobId)))),
    meta: { page, limit, total },
  };
}

export async function createApplication(userId, { jobId, status, cvId }) {
  const job = await Job.findById(jobId).select("title company applyUrl").lean();
  if (!job) throw new AppError("NOT_FOUND", "This job is no longer available.");
  await checkCv(userId, cvId);
  const existing = await Application.findOne({ userId, jobId }).select("_id").lean();
  if (existing) {
    throw new AppError("CONFLICT", "This job is already in your tracker.", {
      details: { applicationId: String(existing._id) },
    });
  }
  const now = new Date();
  const application = await Application.create({
    userId,
    jobId,
    job: { title: job.title, company: job.company, applyUrl: job.applyUrl },
    cvId: cvId ?? null,
    status,
    history: [{ status, at: now }],
  });
  return toApplicationDto(application.toObject());
}

export async function requireApplication(userId, id) {
  const application = await Application.findOne({ _id: id, userId }).lean();
  if (!application) throw new AppError("NOT_FOUND", "Application not found.");
  return application;
}

export async function getApplication(userId, id) {
  const application = await requireApplication(userId, id);
  return toApplicationDto(application, Boolean(await Job.exists({ _id: application.jobId })));
}

export async function updateApplication(userId, id, input) {
  const current = await requireApplication(userId, id);
  if (input.cvId) await checkCv(userId, input.cvId);
  const update = { $set: { ...input, ...(input.cvId !== undefined && { cvDeleted: false }) } };
  // Any status can be set, including backwards (users fix mistakes, F8.4); every change is recorded (F8.3).
  if (input.status && input.status !== current.status)
    update.$push = { history: { status: input.status, at: new Date() } };
  const updated = await Application.findOneAndUpdate({ _id: id, userId }, update, {
    returnDocument: "after",
    runValidators: true,
  }).lean();
  return toApplicationDto(updated, Boolean(await Job.exists({ _id: updated.jobId })));
}

export async function deleteApplication(userId, id) {
  const result = await Application.deleteOne({ _id: id, userId });
  if (result.deletedCount === 0) throw new AppError("NOT_FOUND", "Application not found.");
}
