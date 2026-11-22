import { Suspense } from "react";
import { PageSkeleton } from "@/components/DataStates";
import { JobSearch } from "@/features/jobs/JobSearch";

export const metadata = { title: "Jobs" };

export default function JobsPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={6} />}>
      <JobSearch />
    </Suspense>
  );
}
