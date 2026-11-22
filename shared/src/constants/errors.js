// The only error codes the API may return, with their HTTP status.
export const ERROR_STATUS = Object.freeze({
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_FILE_TYPE: 415,
  RATE_LIMITED: 429,
  AI_LIMIT_REACHED: 429,
  AI_FAILED: 502,
  UPSTREAM_FAILED: 502,
  INTERNAL_ERROR: 500,
});

export const ERROR_CODES = Object.freeze(
  Object.fromEntries(Object.keys(ERROR_STATUS).map((code) => [code, code])),
);

// Client-side only: the request never got a response from the server.
export const NETWORK_ERROR = "NETWORK_ERROR";

export const GENERIC_ERROR_MESSAGE = "Something went wrong";
