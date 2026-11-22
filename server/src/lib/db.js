import mongoose from "mongoose";
import { logger } from "./logger.js";

const CONNECTED = 1;
const SERVER_SELECTION_TIMEOUT_MS = 10_000;

mongoose.set("strictQuery", true);

export function connectDb(uri) {
  return mongoose.connect(uri, { serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS });
}

export function disconnectDb() {
  return mongoose.disconnect();
}

// Used by /health: false means "database unavailable", never a crash.
export async function pingDb() {
  if (mongoose.connection.readyState !== CONNECTED) return false;
  try {
    await mongoose.connection.db.admin().ping();
    return true;
  } catch (error) {
    logger.warn({ err: error }, "Database ping failed");
    return false;
  }
}
