import { AppError } from "../lib/errors.js";

export function notFound(_req, _res, next) {
  next(new AppError("NOT_FOUND", "We couldn't find that."));
}
