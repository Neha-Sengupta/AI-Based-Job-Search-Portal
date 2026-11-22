import { ERROR_STATUS } from "shared/constants/errors";

// The one error class for expected failures. Services throw it; the error handler turns it into a response.
export class AppError extends Error {
  constructor(code, message, { fields, details } = {}) {
    if (!(code in ERROR_STATUS)) throw new TypeError(`Unknown error code: ${code}`);
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = ERROR_STATUS[code];
    this.fields = fields;
    this.details = details;
  }
}
