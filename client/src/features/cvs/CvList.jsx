"use client";

import Link from "next/link";
import Image from "next/image";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { TEMPLATES } from "shared/constants/templates";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/DataStates";
import { toastError } from "@/lib/errors";
import { downloadCv, useCvs, useDeleteCv } from "./api";

const templateOf = (id) => TEMPLATES.find((template) => template.id === id);
const dateFormat = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" });

function CvRow({ cv }) {
  const remove = useDeleteCv();
  const template = templateOf(cv.templateId);
  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      {template && (
        <Image
          src={template.previewImage}
          alt=""
          width={60}
          height={85}
          className="hidden rounded border sm:block"
        />
      )}
      <div className="min-w-0 flex-1">
        <h2 className="font-medium">{cv.title}</h2>
        <p className="text-sm text-muted-foreground">
          {cv.job ? `${cv.job.title} · ${cv.job.company}` : "General"} · {template?.name} ·{" "}
          {dateFormat.format(new Date(cv.createdAt))}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => downloadCv(cv).catch((error) => toastError(error))}
        >
          <Download aria-hidden="true" /> Download
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={`/cvs/${cv.id}`}>
            <Pencil aria-hidden="true" /> Edit
          </Link>
        </Button>
        <ConfirmDialog
          trigger={
            <Button size="sm" variant="ghost" aria-label={`Delete ${cv.title}`}>
              <Trash2 aria-hidden="true" />
            </Button>
          }
          title="Delete this CV?"
          description="Applications that used it will show “CV deleted”. This can't be undone."
          pending={remove.isPending}
          onConfirm={() =>
            remove.mutate(cv.id, {
              onSuccess: () => toast.success("CV deleted"),
              onError: (error) => toastError(error),
            })
          }
        />
      </div>
    </Card>
  );
}

export function CvList() {
  const { data, isPending, error, refetch } = useCvs();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-heading text-2xl font-semibold">My CVs</h1>
        <Button asChild>
          <Link href="/cvs/new">
            <Plus aria-hidden="true" /> Create CV
          </Link>
        </Button>
      </div>
      {isPending && <PageSkeleton rows={3} />}
      {error && <ErrorState error={error} onRetry={refetch} />}
      {data?.data.length === 0 && (
        <EmptyState
          title="No CVs yet"
          description="Create one from any job, or make a general CV."
          action={
            <Button asChild>
              <Link href="/jobs">Browse jobs</Link>
            </Button>
          }
        />
      )}
      {data?.data.length > 0 && (
        <ul className="space-y-3">
          {data.data.map((cv) => (
            <li key={cv.id}>
              <CvRow cv={cv} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
