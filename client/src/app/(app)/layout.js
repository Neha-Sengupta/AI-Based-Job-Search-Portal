import { Suspense } from "react";
import { PageSkeleton } from "@/components/DataStates";
import { ProfileGate } from "@/features/profile/ProfileGate";

// Logged-in pages. The proxy already redirected visitors without a session cookie.
// ProfileGate reads the URL, which Cache Components requires inside a Suspense boundary.
export default function AppLayout({ children }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProfileGate>{children}</ProfileGate>
    </Suspense>
  );
}
