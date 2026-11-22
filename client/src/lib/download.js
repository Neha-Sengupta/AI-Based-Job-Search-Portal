// Downloads a file from our API with Axios (so errors use the normal error flow), then saves it.
import { api } from "./api";

function filenameFrom(disposition, fallback) {
  const match = /filename="([^"]+)"/.exec(disposition ?? "");
  return match?.[1] ?? fallback;
}

export async function downloadFile(path, fallbackName) {
  const res = await api.get(path, { responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filenameFrom(res.headers["content-disposition"], fallbackName);
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
