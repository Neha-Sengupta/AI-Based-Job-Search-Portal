"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ErrorState, PageSkeleton } from "@/components/DataStates";
import { useProfile } from "./api";

// Pages that need a profile; without one the user is sent to /onboarding.
const GATED = ["/dashboard", "/profile", "/cvs", "/tracker"];
const isGated = (pathname) =>
  GATED.some((path) => pathname === path || pathname.startsWith(`${path}/`));

export function ProfileGate({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const gated = isGated(pathname);
  const { data: profile, isPending, error, refetch } = useProfile({ enabled: gated });

  useEffect(() => {
    if (gated && !isPending && !error && profile === null) router.replace("/onboarding");
  }, [gated, isPending, error, profile, router]);

  if (!gated) return children;
  if (isPending || profile === null) return <PageSkeleton />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  return children;
}
