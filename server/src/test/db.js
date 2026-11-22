// Import this FIRST in any test file that touches MongoDB: it gives the file its own throwaway database
// (set before config/env.js reads MONGODB_URI), so test files running in parallel never share data.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll } from "vitest";

const base = process.env.MONGODB_URI.replace(/\/[^/]*$/, "");
process.env.MONGODB_URI = `${base}/jobportal-test-${randomUUID().slice(0, 8)}`;

export function useTestDatabase() {
  beforeAll(async () => {
    const { connectDb } = await import("../lib/db.js");
    await connectDb(process.env.MONGODB_URI);
  });

  afterAll(async () => {
    const { default: mongoose } = await import("mongoose");
    const { authMongoClient } = await import("../lib/auth.js");
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    await authMongoClient.close();
  });
}
