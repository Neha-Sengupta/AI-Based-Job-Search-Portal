import { pipeline } from "node:stream/promises";

// Streams a stored file after the caller has checked ownership. Unsafe filename characters are removed.
export async function sendFileStream(
  res,
  { stream, contentType, length },
  { filename, attachment = false, cache } = {},
) {
  res.setHeader("Content-Type", contentType);
  if (length) res.setHeader("Content-Length", length);
  if (cache) res.setHeader("Cache-Control", cache);
  if (filename) res.setHeader("Content-Disposition", contentDisposition(filename, attachment));
  await pipeline(stream, res);
}

export function contentDisposition(filename, attachment = true) {
  const safe = filename.replace(/[^\p{L}\p{N} ._-]+/gu, "").trim() || "file";
  return `${attachment ? "attachment" : "inline"}; filename="${safe}"`;
}
