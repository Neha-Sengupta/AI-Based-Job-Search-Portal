// GET /usage and DELETE /account.
import { Router } from "express";
import mongoose from "mongoose";
import { usageToday } from "../../lib/ai.js";
import { authMongoClient } from "../../lib/auth.js";
import { deleteUserFiles } from "../../lib/storage.js";
import { AiUsage } from "../ai/model.js";
import { Application } from "../applications/model.js";
import { Cv } from "../cvs/model.js";
import { Profile } from "../profile/model.js";

export const accountRouter = Router();

accountRouter.get("/usage", async (req, res) => {
  res.json({ data: await usageToday(req.user.id) });
});

// Everything the user owns, then Better Auth's records.
export async function deleteAccount(userId) {
  const id = new mongoose.Types.ObjectId(userId);
  await Promise.all([
    Profile.deleteMany({ userId: id }),
    Cv.deleteMany({ userId: id }),
    Application.deleteMany({ userId: id }),
    AiUsage.deleteMany({ userId: id }),
  ]);
  await deleteUserFiles(userId);
  const authDb = authMongoClient.db();
  await Promise.all([
    authDb.collection("session").deleteMany({ userId: id }),
    authDb.collection("account").deleteMany({ userId: id }),
  ]);
  await authDb.collection("user").deleteOne({ _id: id });
}

accountRouter.delete("/account", async (req, res) => {
  await deleteAccount(req.user.id);
  res.status(204).end();
});
