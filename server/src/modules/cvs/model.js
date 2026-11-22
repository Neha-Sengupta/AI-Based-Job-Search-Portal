import mongoose from "mongoose";
import { TEMPLATE_IDS } from "shared/constants/templates";

const { Schema } = mongoose;

const cvSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    jobId: { type: Schema.Types.ObjectId, default: null },
    // Snapshot for the list, so it still reads well after the job is purged.
    job: { type: { title: String, company: String }, default: null, _id: false },
    templateId: { type: String, enum: TEMPLATE_IDS, required: true },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    // Validated by the shared cvContentSchema before saving. No PDF is stored: it's rendered on download.
    content: { type: Object, required: true },
  },
  { timestamps: true, strict: true, minimize: false },
);

cvSchema.index({ userId: 1, createdAt: -1 });

export const Cv = mongoose.model("Cv", cvSchema);
