// The one Axios instance. Components never call it directly; features/<name>/api.js wraps it in hooks.
import axios from "axios";
import { GENERIC_ERROR_MESSAGE, NETWORK_ERROR } from "shared/constants/errors";

export class ApiError extends Error {
  constructor({ code, message, fields, details, status, requestId }) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.fields = fields;
    this.details = details;
    this.status = status;
    this.requestId = requestId;
  }
}

// Every failure becomes one shape: { code, message, fields, details, status, requestId }.
export function normalizeError(error) {
  if (!error.response) {
    return new ApiError({
      code: NETWORK_ERROR,
      message: "We couldn't reach the server. Check your connection and try again.",
      status: 0,
    });
  }
  const { status, data } = error.response;
  const body = data?.error ?? {};
  return new ApiError({
    code: body.code ?? "INTERNAL_ERROR",
    message: body.message ?? GENERIC_ERROR_MESSAGE,
    fields: body.fields,
    details: body.details,
    status,
    requestId: body.requestId,
  });
}

export const api = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(normalizeError(error)),
);
