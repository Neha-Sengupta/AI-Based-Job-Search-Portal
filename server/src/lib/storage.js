// All file access goes through here (GridFS in the main database).
// Swapping to object storage later only changes this file.
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";

const BUCKET_NAME = "files";

const bucket = () =>
  new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: BUCKET_NAME });
const toObjectId = (id) => new mongoose.Types.ObjectId(String(id));

export function saveFile({ userId, kind, buffer, contentType }) {
  return new Promise((resolve, reject) => {
    const upload = bucket().openUploadStream(randomUUID(), {
      metadata: { userId: toObjectId(userId), kind, contentType },
    });
    upload.once("error", reject);
    upload.once("finish", () => resolve(upload.id));
    upload.end(buffer);
  });
}

// Only returns files owned by userId (ownership check in the query itself).
export async function findFile(fileId, userId, kind) {
  if (!mongoose.isValidObjectId(fileId)) return null;
  const filter = { _id: toObjectId(fileId), "metadata.userId": toObjectId(userId) };
  if (kind) filter["metadata.kind"] = kind;
  const [file] = await bucket().find(filter).limit(1).toArray();
  return file ?? null;
}

export async function openFileStream(fileId, userId, kind) {
  const file = await findFile(fileId, userId, kind);
  if (!file) return null;
  return {
    stream: bucket().openDownloadStream(file._id),
    contentType: file.metadata.contentType,
    length: file.length,
  };
}

export async function readFile(fileId, userId, kind) {
  const opened = await openFileStream(fileId, userId, kind);
  if (!opened) return null;
  const chunks = [];
  for await (const chunk of opened.stream) chunks.push(chunk);
  return { buffer: Buffer.concat(chunks), contentType: opened.contentType };
}

export async function deleteFile(fileId, userId) {
  const file = await findFile(fileId, userId);
  if (file) await bucket().delete(file._id);
}

export async function deleteUserFiles(userId) {
  const files = await bucket()
    .find({ "metadata.userId": toObjectId(userId) })
    .project({ _id: 1 })
    .toArray();
  for (const file of files) await bucket().delete(file._id);
}
