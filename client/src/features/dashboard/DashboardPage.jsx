"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CalendarCheck,
  CheckCircle2,
  FileText,
  Gauge,
  Target,
  XCircle,
} from "lucide-react";
import { APPLICATION_STATUS_LABELS } from "shared/constants/applications";
import { WORK_MODEL_LABELS } from "shared/constants/profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/DataStates";
import { StatTile, Meter } from "@/components/viz/StatTile";
import { ColumnChart } from "@/components/viz/ColumnChart";
import { SegmentedBar } from "@/components/viz/SegmentedBar";
import { toastError } from "@/lib/errors";
import { timeAgo } from "@/lib/format";
import { useProfile } from "@/features/profile/api";
import { TipsList } from "@/features/profile/TipsList";
import { useRecommendedJobs } from "@/features/jobs/api";
import { FitBadge } from "@/features/jobs/FitBadge";
import { jobLocation } from "@/features/jobs/JobCard";
import { useApplications } from "@/features/tracker/api";
import { downloadCv, useCvs } from "@/features/cvs/api";
import {
  activity,
  appliedSince,
  fitSummary,
  greeting,
  pipeline,
  recentEvents,
} from "./dashboard-data";

const RECOMMENDED_POOL = 20;
const RECOMMENDED_ROWS = 6;
const TRACKER_LIMIT = 50;

function Panel({ title, description, action, children, className }) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="space-y-1">
          <CardTitle>
            <h2 className="text-base font-semibold">{title}</h2>
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

const PanelLink = ({ href, children }) => (
  <Button asChild variant="ghost" size="sm" className="shrink-0">
    <Link href={href}>
      {children} <ArrowRight aria-hidden="true" />
    </Link>
  </Button>
);

const Loading = ({ className = "h-40" }) => (
  <Skeleton className={`w-full ${className}`} aria-label="Loading" />
);

function RecommendedTable({ jobs }) {
  return (
    <div className="-mx-2 overflow-x-auto">
      <table className="w-full table-fixed text-left text-sm">
        <caption className="sr-only">Recommended jobs, best fit first</caption>
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th scope="col" className="w-auto px-2 py-2 font-medium">
              Role
            </th>
            <th scope="col" className="hidden w-36 px-2 py-2 font-medium md:table-cell">
              Location
            </th>
            <th scope="col" className="hidden w-28 px-2 py-2 font-medium sm:table-cell">
              Work model
            </th>
            <th scope="col" className="w-40 px-2 py-2 text-right font-medium">
              Fit
            </th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id} className="border-b last:border-0 hover:bg-muted/50">
              <td className="px-2 py-2.5">
                <Link
                  href={`/jobs/${job.id}`}
                  className="block truncate font-medium hover:underline"
                >
                  {job.title}
                </Link>
                <span className="block truncate text-xs text-muted-foreground">{job.company}</span>
              </td>
              <td className="hidden px-2 py-2.5 text-muted-foreground md:table-cell">
                {jobLocation(job)}
              </td>
              <td className="hidden px-2 py-2.5 text-muted-foreground sm:table-cell">
                {WORK_MODEL_LABELS[job.workModel]}
              </td>
              <td className="px-2 py-2.5 text-right">
                <FitBadge fit={job.fit} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DashboardPage() {
  const { data: profile } = useProfile();
  const recommended = useRecommendedJobs({ limit: RECOMMENDED_POOL });
  const applications = useApplications({ limit: TRACKER_LIMIT });
  const cvs = useCvs({ limit: 3 });
  if (!profile) return null;

  const apps = applications.data?.data ?? [];
  const jobs = recommended.data?.data ?? [];
  const fit = fitSummary(jobs);
  const interviews = apps.filter((item) => item.status === "interview").length;
  const offers = apps.filter((item) => item.status === "offer").length;
  const events = recentEvents(apps);
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{today}</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting()}, {profile.fullName.split(" ")[0]}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/jobs">
              <Briefcase aria-hidden="true" /> Find jobs
            </Link>
          </Button>
          <Button asChild>
            <Link href="/cvs/new">
              <FileText aria-hidden="true" /> Create CV
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI row: the handful of headline numbers (dataviz: stat tiles, not a chart). */}
      <section aria-label="Key numbers" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile
          label="Profile score"
          value={`${profile.completeness.percent}%`}
          icon={Gauge}
          detail={
            profile.tips.length
              ? `${profile.tips.length} tip${profile.tips.length > 1 ? "s" : ""} to improve`
              : "Looking good"
          }
        >
          <Meter value={profile.completeness.percent} label="Profile score" />
        </StatTile>
        <StatTile
          label="Tracked applications"
          value={applications.isPending ? "–" : (applications.data?.meta.total ?? 0)}
          icon={Briefcase}
          detail={`${appliedSince(apps, 7)} applied in the last 7 days`}
        />
        <StatTile
          label="Interviews"
          value={applications.isPending ? "–" : interviews}
          icon={CalendarCheck}
          detail={`${offers} offer${offers === 1 ? "" : "s"}`}
        />
        <StatTile
          label="Average fit (recommended)"
          value={recommended.isPending ? "–" : fit.average === null ? "n/a" : `${fit.average}%`}
          icon={Target}
          detail={`${fit.strong} strong match${fit.strong === 1 ? "" : "es"} out of ${jobs.length}`}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="grid gap-6 md:grid-cols-2">
            <Panel
              title="Application pipeline"
              description="Where your tracked jobs are now"
              action={<PanelLink href="/tracker">Tracker</PanelLink>}
            >
              {applications.isPending && <Loading />}
              {applications.error && (
                <ErrorState error={applications.error} onRetry={applications.refetch} />
              )}
              {applications.data && apps.length === 0 && (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Save a job to start tracking.
                </p>
              )}
              {apps.length > 0 && (
                <ColumnChart
                  title="Applications by status"
                  data={pipeline(apps)}
                  valueLabel="Applications"
                />
              )}
            </Panel>
            <Panel title="Activity" description="Tracker updates, last 14 days">
              {applications.isPending && <Loading />}
              {applications.data && (
                <ColumnChart
                  title="Tracker updates per day"
                  data={activity(apps)}
                  valueLabel="Updates"
                  showValues={false}
                />
              )}
            </Panel>
          </div>

          <Panel
            title="Recommended for you"
            description="From your preferences, best fit first"
            action={<PanelLink href="/jobs">All jobs</PanelLink>}
          >
            {recommended.isPending && <Loading className="h-64" />}
            {recommended.error && (
              <ErrorState error={recommended.error} onRetry={recommended.refetch} />
            )}
            {recommended.data && jobs.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No recommendations yet.{" "}
                <Link href="/profile#preferences" className="font-medium text-foreground underline">
                  Add preferences
                </Link>
              </div>
            )}
            {jobs.length > 0 && (
              <div className="space-y-5">
                <SegmentedBar
                  title={`Fit across your top ${jobs.length} recommended jobs`}
                  parts={[
                    {
                      key: "strong",
                      label: "Strong fit",
                      value: fit.strong,
                      icon: CheckCircle2,
                      fillClass: "bg-viz-good",
                      textClass: "text-white",
                    },
                    {
                      key: "partial",
                      label: "Partial fit",
                      value: fit.partial,
                      icon: AlertTriangle,
                      fillClass: "bg-viz-warning",
                      textClass: "text-neutral-950",
                    },
                    {
                      key: "not_fit",
                      label: "Not a fit",
                      value: fit.notFit,
                      icon: XCircle,
                      fillClass: "bg-viz-critical",
                      textClass: "text-white",
                    },
                  ]}
                />
                <RecommendedTable jobs={jobs.slice(0, RECOMMENDED_ROWS)} />
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel
            title="Improve your profile"
            description={`${profile.completeness.percent}% complete`}
            action={<PanelLink href="/profile">Profile</PanelLink>}
          >
            <TipsList tips={profile.tips} limit={3} />
          </Panel>

          <Panel title="Recent activity">
            {applications.isPending && <Loading className="h-24" />}
            {applications.data && events.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nothing yet. Saved and applied jobs show up here.
              </p>
            )}
            {events.length > 0 && (
              <ol className="space-y-3">
                {events.map((event) => (
                  <li key={event.id} className="flex gap-3 text-sm">
                    <span
                      className="mt-1.5 size-2 shrink-0 rounded-full bg-viz-series-1"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="truncate">
                        <span className="font-medium">
                          {APPLICATION_STATUS_LABELS[event.status]}
                        </span>{" "}
                        ·{" "}
                        {event.jobAvailable ? (
                          <Link href={`/jobs/${event.jobId}`} className="hover:underline">
                            {event.job.title}
                          </Link>
                        ) : (
                          event.job.title
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {event.job.company} · {timeAgo(event.at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel title="Recent CVs" action={<PanelLink href="/cvs">All CVs</PanelLink>}>
            {cvs.isPending && <Loading className="h-20" />}
            {cvs.error && <ErrorState error={cvs.error} onRetry={cvs.refetch} />}
            {cvs.data?.data.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No CVs yet.{" "}
                <Link href="/cvs/new" className="font-medium text-foreground underline">
                  Make a general CV
                </Link>
              </p>
            )}
            {cvs.data?.data.length > 0 && (
              <ul className="space-y-2">
                {cvs.data.data.map((cv) => (
                  <li key={cv.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <FileText
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <Link href={`/cvs/${cv.id}`} className="truncate hover:underline">
                        {cv.title}
                      </Link>
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => downloadCv(cv).catch((error) => toastError(error))}
                    >
                      Download
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
