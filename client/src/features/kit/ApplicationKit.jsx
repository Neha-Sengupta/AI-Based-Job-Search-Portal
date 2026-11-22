"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { APPLICATION_LIMITS } from "shared/constants/applications";
import { EDUCATION_LEVEL_LABELS } from "shared/constants/profile";
import { yearsOfExperience } from "shared/logic/fit";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CopyField } from "@/components/CopyField";
import { downloadFile } from "@/lib/download";
import { toastError } from "@/lib/errors";
import { useProfile } from "@/features/profile/api";
import { downloadCv, useCvs } from "@/features/cvs/api";
import {
  useApplication,
  useCreateApplication,
  useDraftAnswers,
  useUpdateApplication,
} from "@/features/tracker/api";

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h3 className="font-heading font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function YourDetails({ profile }) {
  const current = profile.experience.find((job) => job.current) ?? profile.experience[0];
  const education = profile.education[0];
  const years = yearsOfExperience(profile.experience);
  return (
    <div>
      <CopyField label="Full name" value={profile.fullName} />
      <CopyField label="Email" value={profile.contactEmail} />
      <CopyField label="Phone" value={profile.phone} />
      <CopyField
        label="Location"
        value={[profile.location?.city, profile.location?.country].filter(Boolean).join(", ")}
      />
      <CopyField label="LinkedIn" value={profile.links?.linkedin} />
      <CopyField label="GitHub" value={profile.links?.github} />
      <CopyField label="Portfolio" value={profile.links?.portfolio} />
      <CopyField
        label="Current title and company"
        value={current && `${current.title}, ${current.company}`}
      />
      <CopyField label="Years of experience" value={years ? String(years) : null} />
      <CopyField
        label="Education"
        value={
          education &&
          [
            education.degree || EDUCATION_LEVEL_LABELS[education.level],
            education.field,
            education.institution,
          ]
            .filter(Boolean)
            .join(", ")
        }
      />
      <CopyField label="Skills" value={profile.skills.join(", ")} />
    </div>
  );
}

function AnswerItem({ answer, index, answers, applicationId }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(answer.answer);
  const update = useUpdateApplication();
  const id = `answer-${index}`;
  function save() {
    const next = answers.map((item, position) =>
      position === index ? { ...item, answer: text.trim() } : item,
    );
    update.mutate(
      { id: applicationId, answers: next },
      {
        onSuccess: () => {
          setEditing(false);
          toast.success("Answer saved");
        },
        onError: (error) => toastError(error),
      },
    );
  }
  return (
    <li className="space-y-2 rounded-md border p-3">
      <p className="text-sm font-medium">{answer.question}</p>
      {editing ? (
        <>
          <label htmlFor={id} className="sr-only">
            Edit answer
          </label>
          <Textarea
            id={id}
            rows={6}
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={APPLICATION_LIMITS.answer}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={update.isPending || !text.trim()}>
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setText(answer.answer);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <>
          <CopyField label="Answer" value={answer.answer} />
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </>
      )}
    </li>
  );
}

function Answers({ applicationId }) {
  const { data: application } = useApplication(applicationId);
  const draft = useDraftAnswers();
  const [question, setQuestion] = useState("");
  const requested = useRef(false);

  // First opening drafts the default answers once (F10.3); afterwards the saved ones are shown (F10.4).
  useEffect(() => {
    if (application && !application.answers.length && !requested.current) {
      requested.current = true;
      draft.mutate({ id: applicationId });
    }
  }, [application, applicationId, draft]);

  const answers = application?.answers ?? [];

  return (
    <div className="space-y-3">
      {draft.isPending && (
        <div className="space-y-2" role="status">
          <p className="flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Drafting answers…
          </p>
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}
      {draft.error && (
        <Alert variant={draft.error.code === "AI_LIMIT_REACHED" ? "default" : "destructive"}>
          <AlertDescription>
            {draft.error.message} Your details above still work.
            {draft.error.code !== "AI_LIMIT_REACHED" && (
              <Button
                size="sm"
                variant="outline"
                className="ml-2"
                onClick={() => draft.mutate({ id: applicationId, regenerate: true })}
              >
                Retry
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}
      {answers.length > 0 && (
        <ul className="space-y-3">
          {answers.map((answer, index) => (
            <AnswerItem
              key={`${answer.question}-${index}`}
              answer={answer}
              index={index}
              answers={answers}
              applicationId={applicationId}
            />
          ))}
        </ul>
      )}
      {answers.length > 0 && (
        <Button
          size="sm"
          variant="outline"
          disabled={draft.isPending}
          onClick={() => draft.mutate({ id: applicationId, regenerate: true })}
        >
          <RefreshCw aria-hidden="true" /> Regenerate default answers
        </Button>
      )}
      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!question.trim()) return;
          draft.mutate(
            { id: applicationId, questions: [question.trim()] },
            { onSuccess: () => setQuestion("") },
          );
        }}
      >
        <label htmlFor="kit-question" className="text-sm font-medium">
          Paste a question from the application form
        </label>
        <Textarea
          id="kit-question"
          rows={2}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={APPLICATION_LIMITS.question}
        />
        <Button type="submit" size="sm" disabled={draft.isPending || !question.trim()}>
          Draft answer
        </Button>
      </form>
    </div>
  );
}

// The application kit side sheet on /jobs/[id] (F10). Opening it creates the tracker entry if needed (F10.1).
export function ApplicationKit({ open, onOpenChange, job }) {
  const { data: profile } = useProfile({ enabled: open });
  const { data: cvs } = useCvs({ jobId: job.id, limit: 20 });
  const create = useCreateApplication();
  const [applicationId, setApplicationId] = useState(job.application?.id ?? null);

  useEffect(() => {
    if (!open || applicationId || create.isPending) return;
    create.mutate(
      { jobId: job.id },
      {
        onSuccess: (application) => setApplicationId(application.id),
        onError: (error) =>
          error.code === "CONFLICT"
            ? setApplicationId(error.details.applicationId)
            : toastError(error),
      },
    );
  }, [open, applicationId, create, job.id]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Prepare your application</SheetTitle>
          <SheetDescription>
            {job.title} at {job.company}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6 px-4 pb-8">
          <Section title="Your details">
            {profile ? <YourDetails profile={profile} /> : <Skeleton className="h-40 w-full" />}
          </Section>
          <Section title="Your CV">
            <ul className="space-y-2">
              {cvs?.data.map((cv) => (
                <li key={cv.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>{cv.title}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadCv(cv).catch((error) => toastError(error))}
                  >
                    <Download aria-hidden="true" /> Download
                  </Button>
                </li>
              ))}
              {profile?.uploadedCvFileId && (
                <li className="flex items-center justify-between gap-2 text-sm">
                  <span>My uploaded CV</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      downloadFile("/profile/cv-download", "cv.pdf").catch((error) =>
                        toastError(error),
                      )
                    }
                  >
                    <Download aria-hidden="true" /> Download
                  </Button>
                </li>
              )}
            </ul>
            <Button asChild size="sm" variant="link" className="px-0">
              <Link href={`/cvs/new?jobId=${job.id}`}>Create a CV for this job</Link>
            </Button>
          </Section>
          <Section title="Answers">
            {applicationId ? (
              <Answers applicationId={applicationId} />
            ) : (
              <Skeleton className="h-20 w-full" />
            )}
          </Section>
          <Section title="Fill in yourself">
            <ul className="list-disc pl-5 text-sm text-muted-foreground">
              <li>Notice period</li>
              <li>Expected salary (CTC)</li>
              <li>Work authorization and relocation</li>
            </ul>
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
