// Start-up order: env → database → listen → shutdown handlers.
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { connectDb, disconnectDb } from "./lib/db.js";
import { createApp } from "./app.js";
import { authMongoClient } from "./lib/auth.js";
import { closePdfBrowser } from "./modules/cvs/pdf.js";

const SHUTDOWN_TIMEOUT_MS = 10_000;

process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "Unhandled promise rejection");
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "Uncaught exception");
  process.exit(1);
});

try {
  await connectDb(env.MONGODB_URI);
  logger.info("Connected to the database");
} catch (error) {
  logger.fatal({ err: error }, "Could not connect to the database");
  process.exit(1);
}

const server = createApp().listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "Server listening");
});

function shutdown(signal) {
  logger.info({ signal }, "Shutting down");
  server.close(async () => {
    await Promise.all([disconnectDb(), authMongoClient.close(), closePdfBrowser()]);
    process.exit(0);
  });
  // Don't hang forever on open connections.
  setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
