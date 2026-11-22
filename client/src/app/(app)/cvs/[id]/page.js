import { Suspense } from "react";
import { PageSkeleton } from "@/components/DataStates";
import { CvEditPage } from "@/features/cvs/CvEditPage";

export const metadata = { title: "Edit CV" };

async function CvFromParams({ params }) {
  const { id } = await params;
  return <CvEditPage id={id} />;
}

export default function Page({ params }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CvFromParams params={params} />
    </Suspense>
  );
}
