// The one place that turns errors into API responses. Registered last.
import { ZodError } from "zod";
import { ERROR_STATUS, GENERIC_ERROR_MESSAGE } from "shared/constants/errors";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

const MONGO_DUPLICATE_KEY = 11000;

const response = (code, message, extra = {}) => ({
  status: ERROR_STATUS[code],
  error: { code, message, ...extra },
});

function zodFields(error) {
  const fields = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    fields[path] ??= issue.message;
  }
  return fields;
}

function toErrorResponse(error) {
  if (error instanceof ZodError) {
    return response("VALIDATION_ERROR", "Some fields are invalid.", { fields: zodFields(error) });
  }
  if (error instanceof AppError) {
    return {
      status: error.status,
      error: {
        code: error.code,
        message: error.message,
        ...(error.fields && { fields: error.fields }),
        ...(error.details && { details: error.details }),
      },
    };
  }
  if (error.type === "entity.parse.failed") {
    return response("VALIDATION_ERROR", "The request body isn't valid JSON.");
  }
  if (error.type === "entity.too.large" || error.code === "LIMIT_FILE_SIZE") {
    return response("PAYLOAD_TOO_LARGE", "That's too large.");
  }
  if (error.name === "MulterError") {
    return response("VALIDATION_ERROR", 'Upload one file in the "file" field.');
  }
  if (error.code === MONGO_DUPLICATE_KEY) {
    return response("CONFLICT", "This already exists.");
  }
  if (error.name === "CastError") {
    return response("VALIDATION_ERROR", "Invalid ID.");
  }
  return response("INTERNAL_ERROR", GENERIC_ERROR_MESSAGE);
}

export function errorHandler(error, req, res, _next) {
  const { status, error: body } = toErrorResponse(error);
  const log = req.log ?? logger;
  const context = {
    requestId: req.id,
    userId: req.user?.id,
    route: `${req.method} ${req.originalUrl.split("?")[0]}`,
  };

  if (status >= 500) {
    log.error({ ...context, err: error }, "Request failed");
  } else {
    log.warn({ ...context, code: body.code, status }, body.message);
  }

  res.status(status).json({ error: { ...body, requestId: req.id } });
}
