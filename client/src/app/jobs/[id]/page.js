import { Suspense } from "react";
import { PageSkeleton } from "@/components/DataStates";
import { JobDetail } from "@/features/jobs/JobDetail";

export const metadata = { title: "Job" };

// params is request-time data: it's awaited inside the Suspense boundary (Cache Components).
async function JobFromParams({ params }) {
  const { id } = await params;
  return <JobDetail id={id} />;
}

export default function JobPage({ params }) {
  return (
    <Suspense fallback={<PageSkeleton rows={5} />}>
      <JobFromParams params={params} />
    </Suspense>
  );
}
