// npm run db:demo: a ready-to-use demo account with a full profile, tracked jobs and a CV, so a new teammate
// can log in and see every screen with data. Local development only. Safe to run twice (skips if it exists).
//   Email: demo@jobportal.local · Password: demo-password-123
import mongoose from "mongoose";
import { profileCreateSchema } from "shared/schemas/profile";
import { connectDb, disconnectDb } from "../src/lib/db.js";
import { logger } from "../src/lib/logger.js";
import { env } from "../src/config/env.js";
import { auth, authMongoClient } from "../src/lib/auth.js";
import { Job } from "../src/modules/jobs/model.js";
import { createProfile } from "../src/modules/profile/service.js";
import { createApplication, updateApplication } from "../src/modules/applications/service.js";
import { createCv, tailor } from "../src/modules/cvs/service.js";

export const DEMO_EMAIL = "demo@jobportal.local";
export const DEMO_PASSWORD = "demo-password-123";
const DAY_MS = 24 * 60 * 60 * 1000;

const PROFILE = {
  source: "form",
  fullName: "Ananya Iyer",
  headline: "Frontend Developer",
  contactEmail: DEMO_EMAIL,
  phone: "+91 98450 12345",
  location: { city: "Bengaluru", country: "IN" },
  links: {
    linkedin: "https://linkedin.com/in/ananya-demo",
    github: "https://github.com/ananya-demo",
  },
  summary:
    "Frontend developer with 2 years of experience building fast, accessible React and Next.js apps for fintech products. Comfortable with Node.js APIs and testing. Looking for a product-focused frontend or full-stack role in Bengaluru or remote.",
  skills: [
    "React",
    "Next.js",
    "JavaScript",
    "TypeScript",
    "Node.js",
    "Tailwind CSS",
    "HTML",
    "CSS",
    "Git",
    "Jest",
    "REST",
    "MongoDB",
    "Figma",
  ],
  experience: [
    {
      title: "Frontend Developer",
      company: "PaySetu Technologies",
      location: "Bengaluru",
      startDate: "2024-01-01",
      current: true,
      bullets: [
        "Rebuilt the merchant dashboard in Next.js, cutting page load time by 45%",
        "Built 30+ reusable React components with Tailwind CSS and Storybook",
        "Added Jest and Testing Library tests, raising coverage from 20% to 70%",
      ],
    },
    {
      title: "Software Engineering Intern",
      company: "Kriya Labs",
      location: "Pune",
      startDate: "2023-01-01",
      endDate: "2023-06-01",
      bullets: [
        "Built a Node.js and MongoDB REST API for an internal inventory tool used by 40 staff",
      ],
    },
  ],
  education: [
    {
      institution: "PES University",
      degree: "B.Tech",
      field: "Computer Science",
      level: "bachelor",
      startDate: "2019-08-01",
      endDate: "2023-06-01",
      grade: "8.6 CGPA",
    },
  ],
  projects: [
    {
      name: "Expense Splitter",
      description: "A PWA to split group expenses with UPI deep links.",
      skills: ["React", "TypeScript", "Tailwind CSS"],
      bullets: ["Used by 300+ students on campus"],
    },
    {
      name: "Job Alerts Bot",
      description: "A Telegram bot that sends daily job alerts.",
      skills: ["Node.js", "MongoDB"],
      bullets: [],
    },
  ],
  certifications: [{ name: "Meta Front-End Developer", issuer: "Coursera", date: "2023-09-01" }],
  preferences: {
    roles: ["Frontend Developer", "Full Stack Developer"],
    workModels: ["remote", "hybrid"],
    jobTypes: ["full_time"],
    countries: ["IN"],
  },
};

// [status path, days ago it started] — gives the dashboard a realistic pipeline and activity chart.
const TRACKED = [
  [["saved"], 1],
  [["saved"], 3],
  [["saved", "applied"], 6],
  [["saved", "applied"], 9],
  [["saved", "applied", "interview"], 12],
  [["saved", "applied", "interview", "offer"], 13],
  [["saved", "applied", "rejected"], 10],
];

async function existingUserId() {
  const user = await authMongoClient.db().collection("user").findOne({ email: DEMO_EMAIL });
  return user ? String(user._id) : null;
}

async function backdate(applicationId, statuses, startedDaysAgo) {
  const { Application } = await import("../src/modules/applications/model.js");
  const history = statuses.map((status, index) => ({
    status,
    at: new Date(Date.now() - (startedDaysAgo - index * 2) * DAY_MS),
  }));
  await Application.updateOne(
    { _id: applicationId },
    { $set: { history, updatedAt: history.at(-1).at } },
    { timestamps: false },
  );
}

await connectDb(env.MONGODB_URI);
try {
  if (await existingUserId()) {
    logger.info({ email: DEMO_EMAIL }, "Demo user already exists; nothing to do");
  } else {
    const { user } = await auth.api.signUpEmail({
      body: { name: PROFILE.fullName, email: DEMO_EMAIL, password: DEMO_PASSWORD },
    });
    await createProfile(user.id, profileCreateSchema.parse(PROFILE));

    const jobs = await Job.find({
      requirements: { $ne: null },
      $text: { $search: "frontend react developer engineer" },
    })
      .select("_id")
      .sort({ score: { $meta: "textScore" } })
      .limit(TRACKED.length)
      .lean();
    for (const [index, job] of jobs.entries()) {
      const [statuses, daysAgo] = TRACKED[index];
      const application = await createApplication(user.id, {
        jobId: String(job._id),
        status: "saved",
      });
      if (statuses.length > 1)
        await updateApplication(user.id, application.id, { status: statuses.at(-1) });
      await backdate(new mongoose.Types.ObjectId(application.id), statuses, daysAgo);
    }

    if (jobs[0]) {
      const draft = await tailor(user.id, { templateId: "modern", jobId: String(jobs[0]._id) });
      await createCv(user.id, {
        templateId: "modern",
        jobId: String(jobs[0]._id),
        title: "Frontend Developer – tailored",
        content: draft.content,
      });
    }
    logger.info({ email: DEMO_EMAIL, tracked: jobs.length }, "Demo user created");
  }
} finally {
  await disconnectDb();
  await authMongoClient.close();
}
