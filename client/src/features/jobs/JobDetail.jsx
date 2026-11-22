"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, FileText, ClipboardList, MapPin } from "lucide-react";
import { EXPERIENCE_LEVEL_LABELS } from "shared/constants/jobs";
import { JOB_TYPE_LABELS, WORK_MODEL_LABELS } from "shared/constants/profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/DataStates";
import { useSession } from "@/lib/auth-client";
import { formatSalary, timeAgo } from "@/lib/format";
import { SaveJobButton } from "@/features/tracker/SaveJobButton";
import { StatusSelect } from "@/features/tracker/StatusSelect";
import { ApplicationKit } from "@/features/kit/ApplicationKit";
import { useJob } from "./api";
import { FitPanel } from "./FitPanel";
import { jobLocation } from "./JobCard";
import { DidYouApplyDialog } from "./DidYouApplyDialog";

// Opens the company site; when the user comes back to this tab, ask "Did you apply?" (F5.3).
function useReturnAfterApply(onReturn) {
  const waiting = useRef(false);
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && waiting.current) {
        waiting.current = false;
        onReturn();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [onReturn]);
  return () => {
    waiting.current = true;
  };
}

export function JobDetail({ id }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const signedIn = Boolean(session?.user);
  const { data: job, isPending, error, refetch } = useJob(id);
  const [askApplied, setAskApplied] = useState(false);
  const startWaiting = useReturnAfterApply(() => setAskApplied(true));
  const kitOpen = searchParams.get("kit") === "1";
  const setKitOpen = (open) =>
    router.replace(open ? `${pathname}?kit=1` : pathname, { scroll: false });

  if (isPending) return <PageSkeleton rows={5} />;
  if (error?.code === "NOT_FOUND") {
    return (
      <EmptyState
        title="This job is no longer available"
        description="It may have been filled or removed by the company."
        action={
          <Button asChild>
            <Link href="/jobs">Back to search</Link>
          </Button>
        }
      />
    );
  }
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const salary = formatSalary(job.salary);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <article className="min-w-0 space-y-6">
        <header className="space-y-2">
          <h1 className="font-heading text-2xl font-semibold">{job.title}</h1>
          <p className="text-lg">{job.company}</p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-4" aria-hidden="true" /> {jobLocation(job)}
            </span>
            {job.workModel !== "unknown" && <span>{WORK_MODEL_LABELS[job.workModel]}</span>}
            {job.jobType !== "unknown" && <span>{JOB_TYPE_LABELS[job.jobType]}</span>}
            {job.experienceLevel !== "unknown" && (
              <span>{EXPERIENCE_LEVEL_LABELS[job.experienceLevel]}</span>
            )}
            <span>Posted {timeAgo(job.postedAt)}</span>
            {salary && <span>{salary}</span>}
          </p>
        </header>

        <div className="flex flex-wrap gap-2">
          <Button asChild onClick={() => signedIn && startWaiting()}>
            <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
              Apply on company site <ExternalLink aria-hidden="true" />
            </a>
          </Button>
          {signedIn && (
            <>
              <Button asChild variant="outline">
                <Link href={`/cvs/new?jobId=${job.id}`}>
                  <FileText aria-hidden="true" /> Create CV for this job
                </Link>
              </Button>
              <Button variant="outline" onClick={() => setKitOpen(true)}>
                <ClipboardList aria-hidden="true" /> Prepare application
              </Button>
              {job.application ? (
                <StatusSelect application={job.application} label="Tracker status" />
              ) : (
                <SaveJobButton jobId={job.id} />
              )}
            </>
          )}
        </div>

        <section aria-labelledby="description-heading" className="space-y-2">
          <h2 id="description-heading" className="font-heading text-lg font-semibold">
            About the job
          </h2>
          {/* Plain text only: the source's HTML is never rendered (F5.7). */}
          <div className="whitespace-pre-line text-sm leading-relaxed">{job.description}</div>
        </section>
        {job.attribution && (
          <p className="text-xs text-muted-foreground">
            <a
              href={job.attribution.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {job.attribution.text}
            </a>
          </p>
        )}
      </article>

      <aside aria-label="Your fit" className="lg:sticky lg:top-6 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2 className="font-heading font-semibold">Your fit</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {signedIn ? (
              <FitPanel job={job} />
            ) : (
              <p className="text-sm">
                <Link
                  href={`/signin?callbackUrl=/jobs/${job.id}`}
                  className="font-medium underline"
                >
                  Sign in
                </Link>{" "}
                to see how well you fit this job.
              </p>
            )}
          </CardContent>
        </Card>
      </aside>

      {signedIn && <DidYouApplyDialog open={askApplied} onOpenChange={setAskApplied} job={job} />}
      {signedIn && <ApplicationKit open={kitOpen} onOpenChange={setKitOpen} job={job} />}
    </div>
  );
}
