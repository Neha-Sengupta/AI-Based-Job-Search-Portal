"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/DataStates";
import { toastError } from "@/lib/errors";
import { useProfile } from "@/features/profile/api";
import { downloadCv, useCv, useDeleteCv, useUpdateCv } from "./api";
import { CvEditor } from "./CvEditor";
import { TemplatePicker } from "./TemplatePicker";

function Editor({ cv, profile }) {
  const router = useRouter();
  const [content, setContent] = useState(cv.content);
  const [title, setTitle] = useState(cv.title);
  const [templateId, setTemplateId] = useState(cv.templateId);
  const update = useUpdateCv();
  const remove = useDeleteCv();
  const skills = [
    ...new Set([...profile.skills, ...profile.projects.flatMap((project) => project.skills ?? [])]),
  ];

  const save = () =>
    update.mutateAsync({ id: cv.id, title: title.trim(), templateId, content }).then(
      (saved) => {
        toast.success("Saved");
        return saved;
      },
      (error) => {
        toastError(error, { onRetry: save });
        throw error;
      },
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1 space-y-1.5">
          <Label htmlFor="cv-title">CV title</Label>
          <Input
            id="cv-title"
            value={title}
            maxLength={100}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <Button onClick={save} disabled={update.isPending || !title.trim()}>
          {update.isPending && <Loader2 className="animate-spin" aria-hidden="true" />} Save
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            save()
              .then((saved) => downloadCv(saved))
              .catch((error) => error.code !== "VALIDATION_ERROR" && toastError(error))
          }
        >
          <Download aria-hidden="true" /> Save & download
        </Button>
        <ConfirmDialog
          trigger={<Button variant="ghost">Delete</Button>}
          title="Delete this CV?"
          description="This can't be undone."
          pending={remove.isPending}
          onConfirm={() =>
            remove.mutate(cv.id, {
              onSuccess: () => router.replace("/cvs"),
              onError: (error) => toastError(error),
            })
          }
        />
      </div>
      <details className="rounded-lg border p-3">
        <summary className="cursor-pointer text-sm font-medium">Change template</summary>
        <div className="pt-3">
          <TemplatePicker value={templateId} onChange={setTemplateId} />
        </div>
      </details>
      <CvEditor
        content={content}
        onChange={setContent}
        templateId={templateId}
        profileSkills={skills}
      />
    </div>
  );
}

export function CvEditPage({ id }) {
  const cv = useCv(id);
  const profile = useProfile();
  if (cv.isPending || profile.isPending) return <PageSkeleton />;
  if (cv.error?.code === "NOT_FOUND")
    return <EmptyState title="CV not found" description="It may have been deleted." />;
  if (cv.error) return <ErrorState error={cv.error} onRetry={cv.refetch} />;
  return <Editor cv={cv.data} profile={profile.data} />;
}
