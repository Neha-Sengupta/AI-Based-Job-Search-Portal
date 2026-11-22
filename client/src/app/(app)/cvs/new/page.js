import { Suspense } from "react";
import { PageSkeleton } from "@/components/DataStates";
import { CvCreator } from "@/features/cvs/CvCreator";

export const metadata = { title: "Create a CV" };

export default function NewCvPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CvCreator />
    </Suspense>
  );
}
