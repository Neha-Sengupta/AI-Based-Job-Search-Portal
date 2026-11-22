"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS } from "shared/constants/applications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/DataStates";
import { timeAgo } from "@/lib/format";
import { toastError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { useCvs } from "@/features/cvs/api";
import { useApplications, useDeleteApplication, useUpdateApplication } from "./api";
import { StatusSelect } from "./StatusSelect";

const TRACKER_LIMIT = 50;

function cvLabel(application, cvTitles) {
  if (application.cvDeleted) return "CV deleted";
  if (application.cvId) return cvTitles.get(application.cvId) ?? "Tailored CV";
  return "Own CV";
}

function NotesEditor({ application, onDone }) {
  const [notes, setNotes] = useState(application.notes);
  const update = useUpdateApplication();
  const id = `notes-${application.id}`;
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-xs font-medium">
        Notes
      </label>
      <Textarea
        id={id}
        rows={3}
        value={notes}
        maxLength={2000}
        onChange={(event) => setNotes(event.target.value)}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={update.isPending}
          onClick={() =>
            update.mutate(
              { id: application.id, notes },
              {
                onSuccess: () => {
                  toast.success("Notes saved");
                  onDone();
                },
                onError: (error) => toastError(error),
              },
            )
          }
        >
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function ApplicationCard({ application, cvTitles }) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const remove = useDeleteApplication();
  return (
    <Card className="space-y-2 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium break-words">
            {application.jobAvailable ? (
              <Link href={`/jobs/${application.jobId}`} className="hover:underline">
                {application.job.title}
              </Link>
            ) : (
              application.job.title
            )}
          </p>
          <p className="text-sm">{application.job.company}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Actions for ${application.job.title}`}>
              <MoreHorizontal aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {application.jobAvailable && (
              <>
                <DropdownMenuItem asChild>
                  <Link href={`/jobs/${application.jobId}`}>Open job</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/jobs/${application.jobId}?kit=1`}>Open application kit</Link>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem onSelect={() => setEditingNotes(true)}>Notes</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setConfirmDelete(true)}>Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
        <span>{cvLabel(application, cvTitles)}</span>
        <span>· updated {timeAgo(application.updatedAt)}</span>
      </div>
      {!application.jobAvailable && <Badge variant="outline">Job no longer available</Badge>}
      {application.notes && !editingNotes && (
        <p className="text-xs whitespace-pre-line">{application.notes}</p>
      )}
      {editingNotes && (
        <NotesEditor application={application} onDone={() => setEditingNotes(false)} />
      )}
      <StatusSelect application={application} />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Remove from tracker?"
        description={`${application.job.title} at ${application.job.company} will be removed from your tracker.`}
        confirmLabel="Remove"
        pending={remove.isPending}
        onConfirm={() =>
          remove.mutate(application.id, {
            onSuccess: () => setConfirmDelete(false),
            onError: (error) => toastError(error),
          })
        }
      />
    </Card>
  );
}

export function TrackerPage() {
  const { data, isPending, error, refetch } = useApplications({ limit: TRACKER_LIMIT });
  const { data: cvs } = useCvs({ limit: TRACKER_LIMIT });
  const [filter, setFilter] = useState("all");
  const cvTitles = new Map((cvs?.data ?? []).map((cv) => [cv.id, cv.title]));

  if (isPending) return <PageSkeleton rows={4} />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const applications = data.data;
  const byStatus = (status) => applications.filter((item) => item.status === status);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold">Application tracker</h1>
      {applications.length === 0 ? (
        <EmptyState
          title="Nothing tracked yet"
          description="Save jobs from search to track them here."
          action={
            <Button asChild>
              <Link href="/jobs">Browse jobs</Link>
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop: a board with one column per status. */}
          <div className="hidden gap-4 lg:grid lg:grid-cols-5">
            {APPLICATION_STATUSES.map((status) => (
              <section
                key={status}
                aria-labelledby={`col-${status}`}
                className="space-y-3 rounded-lg bg-muted/50 p-3"
              >
                <h2 id={`col-${status}`} className="text-sm font-semibold">
                  {APPLICATION_STATUS_LABELS[status]}{" "}
                  <span className="text-muted-foreground">({byStatus(status).length})</span>
                </h2>
                <ul className="space-y-3">
                  {byStatus(status).map((application) => (
                    <li key={application.id}>
                      <ApplicationCard application={application} cvTitles={cvTitles} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          {/* Mobile: a list with status filter chips (F8.8). */}
          <div className="space-y-4 lg:hidden">
            <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
              {["all", ...APPLICATION_STATUSES].map((status) => (
                <button
                  key={status}
                  type="button"
                  aria-pressed={filter === status}
                  onClick={() => setFilter(status)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm",
                    filter === status && "border-primary bg-primary text-primary-foreground",
                  )}
                >
                  {status === "all" ? "All" : APPLICATION_STATUS_LABELS[status]} (
                  {status === "all" ? applications.length : byStatus(status).length})
                </button>
              ))}
            </div>
            <ul className="space-y-3">
              {(filter === "all" ? applications : byStatus(filter)).map((application) => (
                <li key={application.id}>
                  <ApplicationCard application={application} cvTitles={cvTitles} />
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
