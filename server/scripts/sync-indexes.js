// npm run db:indexes: builds the indexes defined in the Mongoose schemas.
import mongoose from "mongoose";
import { connectDb, disconnectDb } from "../src/lib/db.js";
import { logger } from "../src/lib/logger.js";
import { env } from "../src/config/env.js";
import "../src/modules/profile/model.js";
import "../src/modules/jobs/model.js";
import "../src/modules/applications/model.js";
import "../src/modules/cvs/model.js";
import "../src/modules/ai/model.js";

await connectDb(env.MONGODB_URI);
for (const model of Object.values(mongoose.models)) {
  await model.syncIndexes();
  logger.info({ model: model.modelName }, "Indexes synced");
}
await disconnectDb();
