import mongoose from "mongoose";
import {
  EDUCATION_LEVELS,
  JOB_TYPES,
  PROFILE_LIMITS as L,
  PROFILE_SOURCES,
  WORK_MODELS,
} from "shared/constants/profile";

const { Schema } = mongoose;
const maxItems = (max) => ({
  validator: (list) => list.length <= max,
  message: `At most ${max} items`,
});
const text = (max) => ({ type: String, trim: true, maxlength: max });
const bullets = { type: [text(L.bullet)], validate: maxItems(L.bullets), default: [] };

const experienceSchema = new Schema(
  {
    title: { ...text(L.title), required: true },
    company: { ...text(L.company), required: true },
    location: text(L.city),
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    current: { type: Boolean, default: false },
    bullets,
  },
  { _id: false },
);

const educationSchema = new Schema(
  {
    institution: { ...text(L.institution), required: true },
    degree: text(L.degree),
    field: text(L.field),
    level: { type: String, enum: EDUCATION_LEVELS, required: true },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    current: { type: Boolean, default: false },
    grade: text(L.grade),
  },
  { _id: false },
);

const projectSchema = new Schema(
  {
    name: { ...text(L.projectName), required: true },
    description: text(L.projectDescription),
    bullets,
    skills: { type: [text(L.skill)], validate: maxItems(L.projectSkills), default: [] },
    url: text(500),
  },
  { _id: false },
);

const certificationSchema = new Schema(
  {
    name: { ...text(L.certificationName), required: true },
    issuer: text(L.issuer),
    date: { type: Date, default: null },
    url: text(500),
  },
  { _id: false },
);

const profileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, unique: true },
    source: { type: String, enum: PROFILE_SOURCES, required: true },
    uploadedCvFileId: { type: Schema.Types.ObjectId, default: null },
    photoFileId: { type: Schema.Types.ObjectId, default: null },
    fullName: { ...text(L.fullName), required: true },
    headline: text(L.headline),
    contactEmail: { ...text(254), lowercase: true },
    phone: text(L.phone),
    location: {
      city: text(L.city),
      country: { type: String, uppercase: true, match: /^[A-Z]{2}$/ },
    },
    links: { linkedin: text(500), github: text(500), portfolio: text(500) },
    summary: text(L.summary),
    skills: { type: [text(L.skill)], validate: maxItems(L.skills), default: [] },
    experience: { type: [experienceSchema], validate: maxItems(L.experience), default: [] },
    education: { type: [educationSchema], validate: maxItems(L.education), default: [] },
    projects: { type: [projectSchema], validate: maxItems(L.projects), default: [] },
    certifications: {
      type: [certificationSchema],
      validate: maxItems(L.certifications),
      default: [],
    },
    preferences: {
      roles: { type: [text(L.role)], default: [] },
      workModels: { type: [{ type: String, enum: WORK_MODELS }], default: [] },
      jobTypes: { type: [{ type: String, enum: JOB_TYPES }], default: [] },
      countries: { type: [{ type: String, uppercase: true, match: /^[A-Z]{2}$/ }], default: [] },
      minSalary: { type: { amount: Number, currency: String }, default: null, _id: false },
    },
  },
  { timestamps: true, strict: true },
);

export const Profile = mongoose.model("Profile", profileSchema);
