import mongoose from "mongoose";
import { APPLICATION_LIMITS as L, APPLICATION_STATUSES } from "shared/constants/applications";

const { Schema } = mongoose;

const applicationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    jobId: { type: Schema.Types.ObjectId, required: true },
    // Snapshot: survives the job being purged (F4.10, F8.5).
    job: { title: String, company: String, applyUrl: String },
    cvId: { type: Schema.Types.ObjectId, default: null },
    // Set when the CV used was deleted, so the tracker can say "CV deleted" (F8.6).
    cvDeleted: { type: Boolean, default: false },
    status: { type: String, enum: APPLICATION_STATUSES, required: true, default: "saved" },
    history: [{ _id: false, status: { type: String, enum: APPLICATION_STATUSES }, at: Date }],
    notes: { type: String, maxlength: L.notes, default: "" },
    answers: {
      type: [
        {
          _id: false,
          question: { type: String, maxlength: L.question },
          answer: { type: String, maxlength: L.answer },
          generatedAt: Date,
        },
      ],
      validate: {
        validator: (list) => list.length <= L.answers,
        message: `At most ${L.answers} answers`,
      },
      default: [],
    },
  },
  { timestamps: true, strict: true },
);

applicationSchema.index({ userId: 1, jobId: 1 }, { unique: true });
applicationSchema.index({ userId: 1, status: 1, updatedAt: -1 });

export const Application = mongoose.model("Application", applicationSchema);
