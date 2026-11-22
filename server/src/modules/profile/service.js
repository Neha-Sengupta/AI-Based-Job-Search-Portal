import { calculateCompleteness } from "shared/logic/completeness";
import { getProfileTips } from "shared/logic/tips";
import { AppError } from "../../lib/errors.js";
import { toIsoDay } from "../../lib/dates.js";
import { deleteFile, findFile, openFileStream, saveFile } from "../../lib/storage.js";
import { Profile } from "./model.js";

export const FILE_KIND = Object.freeze({ cv: "cv_upload", photo: "photo" });

const withIsoDates = (items = [], keys) =>
  items.map((item) =>
    Object.fromEntries(
      Object.entries(item).map(([key, value]) => [
        key,
        keys.includes(key) ? toIsoDay(value) : value,
      ]),
    ),
  );

const photoUrl = (profile) =>
  profile.photoFileId ? `/api/v1/profile/photo?v=${profile.photoFileId}` : null;

// The API shape of a profile: dates as YYYY-MM-DD, plus calculated fields.
export function toProfileDto(doc) {
  const { _id, userId: _userId, __v: _version, ...profile } = doc;
  const dto = {
    id: String(_id),
    ...profile,
    uploadedCvFileId: profile.uploadedCvFileId ? String(profile.uploadedCvFileId) : null,
    photoFileId: profile.photoFileId ? String(profile.photoFileId) : null,
    experience: withIsoDates(profile.experience, ["startDate", "endDate"]),
    education: withIsoDates(profile.education, ["startDate", "endDate"]),
    certifications: withIsoDates(profile.certifications, ["date"]),
  };
  return {
    ...dto,
    completeness: calculateCompleteness(dto),
    tips: getProfileTips(dto),
    photoUrl: photoUrl(dto),
  };
}

export async function findProfile(userId) {
  return Profile.findOne({ userId }).lean();
}

export async function getProfile(userId) {
  const profile = await findProfile(userId);
  if (!profile) throw new AppError("NOT_FOUND", "You don't have a profile yet.");
  return toProfileDto(profile);
}

export async function createProfile(userId, input) {
  if (input.uploadedCvFileId && !(await findFile(input.uploadedCvFileId, userId, FILE_KIND.cv))) {
    throw new AppError("VALIDATION_ERROR", "That uploaded CV wasn't found.", {
      fields: { uploadedCvFileId: "Upload your CV again" },
    });
  }
  if (await Profile.exists({ userId })) {
    throw new AppError("CONFLICT", "You already have a profile.");
  }
  const created = await Profile.create({ ...input, userId });
  return toProfileDto(created.toObject());
}

export async function updateProfile(userId, input) {
  const updated = await Profile.findOneAndUpdate(
    { userId },
    { $set: input },
    { returnDocument: "after", runValidators: true },
  ).lean();
  if (!updated) throw new AppError("NOT_FOUND", "You don't have a profile yet.");
  return toProfileDto(updated);
}

async function requireProfile(userId) {
  const profile = await findProfile(userId);
  if (!profile) throw new AppError("NOT_FOUND", "Create your profile first.");
  return profile;
}

export async function setPhoto(userId, { buffer, contentType }) {
  const profile = await requireProfile(userId);
  const fileId = await saveFile({ userId, kind: FILE_KIND.photo, buffer, contentType });
  await Profile.updateOne({ userId }, { $set: { photoFileId: fileId } });
  if (profile.photoFileId) await deleteFile(profile.photoFileId, userId);
  return { photoUrl: photoUrl({ photoFileId: fileId }) };
}

export async function deletePhoto(userId) {
  const profile = await findProfile(userId);
  if (!profile?.photoFileId) return;
  await Profile.updateOne({ userId }, { $set: { photoFileId: null } });
  await deleteFile(profile.photoFileId, userId);
}

export async function openPhoto(userId) {
  const profile = await findProfile(userId);
  const opened = profile?.photoFileId
    ? await openFileStream(profile.photoFileId, userId, FILE_KIND.photo)
    : null;
  if (!opened) throw new AppError("NOT_FOUND", "No photo.");
  return opened;
}

export async function openUploadedCv(userId) {
  const profile = await findProfile(userId);
  const opened = profile?.uploadedCvFileId
    ? await openFileStream(profile.uploadedCvFileId, userId, FILE_KIND.cv)
    : null;
  if (!opened) throw new AppError("NOT_FOUND", "You haven't uploaded a CV.");
  return opened;
}
