"use client";

import { useState } from "react";
import { QueryCache, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import { makeQueryClient } from "@/lib/query-client";

// A lost session on any request → sign in, then come back to this page.
function redirectToSignIn() {
  const callbackUrl = encodeURIComponent(window.location.pathname + window.location.search);
  // Outside React (a QueryCache callback), so no router: a full navigation also drops stale state.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`/signin?callbackUrl=${callbackUrl}`);
}

function onQueryError(error) {
  if (error?.code === "UNAUTHENTICATED") redirectToSignIn();
}

export function Providers({ children }) {
  // One QueryClient per browser session (not shared between server requests).
  const [queryClient] = useState(() =>
    makeQueryClient({ queryCache: new QueryCache({ onError: onQueryError }) }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-center" richColors closeButton />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
