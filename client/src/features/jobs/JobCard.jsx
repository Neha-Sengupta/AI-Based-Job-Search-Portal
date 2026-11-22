import Link from "next/link";
import { MapPin } from "lucide-react";
import { JOB_TYPE_LABELS, WORK_MODEL_LABELS } from "shared/constants/profile";
import { Card } from "@/components/ui/card";
import { formatSalary, timeAgo } from "@/lib/format";
import { FitBadge } from "./FitBadge";
import { SaveJobButton } from "@/features/tracker/SaveJobButton";

export const jobLocation = (job) =>
  [job.location?.city, job.location?.country].filter(Boolean).join(", ") ||
  job.location?.raw ||
  "Location not given";

export function JobCard({ job, signedIn }) {
  const salary = formatSalary(job.salary);
  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <h3 className="font-heading font-semibold">
          <Link href={`/jobs/${job.id}`} className="hover:underline">
            {job.title}
          </Link>
        </h3>
        <p className="text-sm">{job.company}</p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden="true" /> {jobLocation(job)}
          </span>
          {job.workModel !== "unknown" && <span>{WORK_MODEL_LABELS[job.workModel]}</span>}
          {job.jobType !== "unknown" && <span>{JOB_TYPE_LABELS[job.jobType]}</span>}
          <span>{timeAgo(job.postedAt)}</span>
          {salary && <span>{salary}</span>}
        </p>
        {job.fit?.missing?.length > 0 && (
          <p className="text-xs text-muted-foreground">Missing: {job.fit.missing.join(", ")}</p>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
        <FitBadge fit={job.fit} />
        {signedIn && <SaveJobButton jobId={job.id} />}
      </div>
    </Card>
  );
}
