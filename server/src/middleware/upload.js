// Uploads: in memory, size-limited, type detected from the CONTENT, not the name or header.
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import { AppError } from "../lib/errors.js";

export const FILE_KINDS = Object.freeze({
  cv: {
    mimeTypes: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    message: "We couldn't read that file. Please upload a PDF or DOCX.",
  },
  photo: {
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
    message: "Please upload a JPG, PNG or WebP image.",
  },
});

export function uploadSingle(maxBytes) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1 },
  }).single("file");
}

// Returns the detected MIME type, or throws 415.
export async function detectFileType(file, kind) {
  if (!file)
    throw new AppError("VALIDATION_ERROR", "Choose a file to upload.", {
      fields: { file: "Required" },
    });
  const detected = await fileTypeFromBuffer(file.buffer);
  if (!detected || !FILE_KINDS[kind].mimeTypes.includes(detected.mime)) {
    throw new AppError("UNSUPPORTED_FILE_TYPE", FILE_KINDS[kind].message);
  }
  return detected.mime;
}
