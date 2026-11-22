// The Express app. Middleware order matters: proxy trust, logging, security headers, CORS, rate limit, auth, JSON, routes, errors.
import { randomUUID } from "node:crypto";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { pinoHttp } from "pino-http";
import { toNodeHandler } from "better-auth/node";
import { JSON_BODY_LIMIT } from "shared/constants/limits";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { auth } from "./lib/auth.js";
import { globalLimiter } from "./middleware/rate-limit.js";
import { notFound } from "./middleware/not-found.js";
import { errorHandler } from "./middleware/error-handler.js";
import { healthRouter } from "./modules/health/routes.js";
import { apiRouter } from "./routes.js";
import { internalRouter } from "./modules/internal/routes.js";

function requestId(_req, res) {
  const id = randomUUID();
  res.setHeader("X-Request-Id", id);
  return id;
}

export function createApp() {
  const app = express();

  // Requests arrive through Vercel's and Render's proxies; without this every visitor shares one IP.
  app.set("trust proxy", env.TRUST_PROXY_HOPS);

  app.use(
    pinoHttp({
      logger,
      genReqId: requestId,
      // Errors are logged once, with context, by the error handler.
      customLogLevel: (_req, res) => (res.statusCode >= 400 ? "silent" : "info"),
    }),
  );
  app.use(helmet());
  app.use(cors({ origin: env.APP_URL, credentials: true }));
  app.use(globalLimiter);
  // Before express.json(): Better Auth reads the request body itself.
  app.all("/api/auth/*splat", toNodeHandler(auth));
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  app.use(healthRouter);
  app.use("/api/v1", apiRouter);
  app.use("/internal", internalRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
