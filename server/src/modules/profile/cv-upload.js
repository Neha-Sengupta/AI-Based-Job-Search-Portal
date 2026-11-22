// POST /profile/cv-upload: store the file, parse it with rules, return a draft.
// Nothing is saved to the profile here; the user reviews the draft first (F2.3).
import { saveFile } from "../../lib/storage.js";
import { FILE_KIND } from "./service.js";

let parserModule;
const loadParser = async () => (parserModule ??= await import("./cv-parser/parse-cv.js"));

export async function uploadCv(userId, { buffer, contentType }) {
  const uploadedCvFileId = await saveFile({ userId, kind: FILE_KIND.cv, buffer, contentType });
  const { parseCv } = await loadParser();
  const { draft, warnings } = await parseCv({ buffer, mimeType: contentType });
  return { uploadedCvFileId: String(uploadedCvFileId), draft, warnings };
}
