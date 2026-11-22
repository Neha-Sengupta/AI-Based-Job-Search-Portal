// npm run db:seed: loads the saved fixture jobs (no network, no AI) into the dev database.
import { connectDb, disconnectDb } from "../src/lib/db.js";
import { logger } from "../src/lib/logger.js";
import { env } from "../src/config/env.js";
import { runImport } from "../src/modules/jobs/import.js";

await connectDb(env.MONGODB_URI);
await runImport({ sources: ["fixtures"], maxPerSource: 0, logger });
await disconnectDb();
