import mongoose from "mongoose";
import {
  EXPERIENCE_LEVELS,
  JOB_JOB_TYPES,
  JOB_LIMITS as L,
  JOB_WORK_MODELS,
  SALARY_PERIODS,
} from "shared/constants/jobs";
import { EDUCATION_LEVELS } from "shared/constants/profile";

const { Schema } = mongoose;

const jobSchema = new Schema(
  {
    source: { type: String, required: true },
    sourceId: { type: String, required: true },
    dedupeKey: { type: String, required: true },
    title: { type: String, required: true, trim: true, maxlength: L.title },
    company: { type: String, required: true, trim: true, maxlength: L.company },
    location: {
      city: { type: String, default: null },
      country: { type: String, default: null },
      raw: { type: String, default: "" },
    },
    workModel: { type: String, enum: JOB_WORK_MODELS, default: "unknown" },
    jobType: { type: String, enum: JOB_JOB_TYPES, default: "unknown" },
    experienceLevel: { type: String, enum: EXPERIENCE_LEVELS, default: "unknown" },
    salary: {
      type: {
        min: Number,
        max: Number,
        currency: String,
        period: { type: String, enum: SALARY_PERIODS },
      },
      default: null,
      _id: false,
    },
    description: { type: String, required: true, maxlength: L.description },
    applyUrl: { type: String, required: true },
    postedAt: { type: Date, required: true },
    requirements: {
      type: {
        mustHave: [String],
        niceToHave: [String],
        minYears: { type: Number, default: null },
        education: { type: String, enum: [...EDUCATION_LEVELS, null], default: null },
        extractedAt: Date,
        extractorVersion: Number,
      },
      default: null,
      _id: false,
    },
  },
  { timestamps: true, strict: true },
);

jobSchema.index({ source: 1, sourceId: 1 }, { unique: true });
jobSchema.index({ dedupeKey: 1 }, { unique: true });
jobSchema.index({ postedAt: -1 });
jobSchema.index(
  { title: "text", company: "text", description: "text" },
  { weights: { title: 10, company: 5, description: 1 }, name: "job_text" },
);
jobSchema.index({ "location.country": 1, workModel: 1, postedAt: -1 });

export const Job = mongoose.model("Job", jobSchema);
