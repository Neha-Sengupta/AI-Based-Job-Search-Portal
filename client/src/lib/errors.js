// What the user sees for each error.
import { toast } from "sonner";
import { GENERIC_ERROR_MESSAGE, NETWORK_ERROR } from "shared/constants/errors";

const RETRYABLE = new Set(["AI_FAILED", "UPSTREAM_FAILED", "INTERNAL_ERROR", NETWORK_ERROR]);

export function isRetryable(error) {
  return RETRYABLE.has(error?.code) || error?.status >= 500;
}

// Maps server field errors onto a React Hook Form form. Returns true if any field was set.
export function applyFieldErrors(form, error) {
  const fields = error?.fields ?? {};
  const entries = Object.entries(fields);
  for (const [name, message] of entries) form.setError(name, { type: "server", message });
  return entries.length > 0;
}

export function toastError(error, { onRetry } = {}) {
  const message = error?.message || GENERIC_ERROR_MESSAGE;
  if (isRetryable(error) && onRetry) {
    toast.error(message, { action: { label: "Retry", onClick: onRetry } });
  } else {
    toast.error(message);
  }
}

// Standard mutation error handling: field errors go under inputs, everything else becomes a toast.
export function handleFormError(form, error, options) {
  if (!applyFieldErrors(form, error)) toastError(error, options);
}
