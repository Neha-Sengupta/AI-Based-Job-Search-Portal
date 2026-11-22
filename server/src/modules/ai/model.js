import mongoose from "mongoose";

const { Schema } = mongoose;
const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

const aiUsageSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    day: { type: String, required: true }, // "YYYY-MM-DD" UTC
    count: { type: Number, default: 0 },
  },
  { timestamps: true, strict: true },
);

aiUsageSchema.index({ userId: 1, day: 1 }, { unique: true });
aiUsageSchema.index({ createdAt: 1 }, { expireAfterSeconds: THIRTY_DAYS_SECONDS });

export const AiUsage = mongoose.model("AiUsage", aiUsageSchema);
