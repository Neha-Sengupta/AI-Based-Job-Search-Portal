import { QueryClient } from "@tanstack/react-query";
import { NETWORK_ERROR } from "shared/constants/errors";

const STALE_TIME_MS = 30_000;
const MAX_RETRIES = 2;

// Retry reads only when retrying can help: network errors and 5xx. Never retry 4xx.
export function shouldRetry(failureCount, error) {
  if (failureCount >= MAX_RETRIES) return false;
  return error?.code === NETWORK_ERROR || error?.status >= 500;
}

export function makeQueryClient(options = {}) {
  return new QueryClient({
    ...options,
    defaultOptions: {
      queries: { staleTime: STALE_TIME_MS, retry: shouldRetry },
      mutations: { retry: false },
    },
  });
}
