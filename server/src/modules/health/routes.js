import { Router } from "express";
import { pingDb } from "../../lib/db.js";

export const healthRouter = Router();

healthRouter.get("/health", async (_req, res) => {
  const databaseUp = await pingDb();
  res
    .status(databaseUp ? 200 : 503)
    .json({ data: { status: databaseUp ? "ok" : "db_unavailable" } });
});
