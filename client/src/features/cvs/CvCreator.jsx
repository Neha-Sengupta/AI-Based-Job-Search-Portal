"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ErrorState, PageSkeleton } from "@/components/DataStates";
import { toastError } from "@/lib/errors";
import { useJob } from "@/features/jobs/api";
import { useProfile, useUpdateProfile } from "@/features/profile/api";
import { useCreateApplication } from "@/features/tracker/api";
import { downloadCv, useCreateCv, useTailorCv } from "./api";
import { CvEditor } from "./CvEditor";
import { TemplatePicker } from "./TemplatePicker";

const profileSkillNames = (profile) => [
  ...new Set([
    ...(profile?.skills ?? []),
    ...(profile?.projects ?? []).flatMap((project) => project.skills ?? []),
  ]),
];

function MissingQuestions({ missing, onAdd, onDone, adding }) {
  const [index, setIndex] = useState(0);
  const [added, setAdded] = useState(false);
  const skill = missing[index];

  // Move to the next question, or finish after the last one.
  const next = (addedNow) => {
    const anyAdded = added || addedNow;
    if (index + 1 >= missing.length) onDone(anyAdded);
    else {
      setAdded(anyAdded);
      setIndex(index + 1);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <p className="font-medium">
        This job asks for {skill}. Do you have experience with {skill}?
      </p>
      <p className="text-sm text-muted-foreground">
        We never add skills for you. Say yes only if it&apos;s true; it will be added to your
        profile.
      </p>
      <div className="flex gap-2">
        <Button disabled={adding} onClick={() => onAdd(skill).then(() => next(true))}>
          Yes, add it to my profile
        </Button>
        <Button variant="outline" onClick={() => next(false)}>
          No
        </Button>
      </div>
    </div>
  );
}

export function CvCreator() {
  const router = useRouter();
  const jobId = useSearchParams().get("jobId");
  const { data: profile, isPending: profilePending } = useProfile();
  const job = useJob(jobId);
  const tailor = useTailorCv();
  const updateProfile = useUpdateProfile();
  const createCv = useCreateCv();
  const createApplication = useCreateApplication();
  const [step, setStep] = useState("template");
  const [templateId, setTemplateId] = useState("classic");
  const [draft, setDraft] = useState(null);
  const [title, setTitle] = useState("");
  const [saved, setSaved] = useState(null);

  if (profilePending || (jobId && job.isPending)) return <PageSkeleton />;
  if (jobId && job.error)
    return <ErrorState error={job.error} title="This job is no longer available" />;

  const jobData = jobId ? job.data : null;

  async function runTailor({ skipQuestions = false } = {}) {
    setStep("tailoring");
    try {
      const result = await tailor.mutateAsync({ templateId, ...(jobId && { jobId }) });
      setDraft(result);
      setTitle(
        [result.content.basics.headline || profile.headline || "My CV", jobData?.company]
          .filter(Boolean)
          .join(" – "),
      );
      setStep(result.missingRequirements.length && !skipQuestions ? "questions" : "review");
    } catch (error) {
      toastError(error, { onRetry: runTailor });
      setStep("template");
    }
  }

  // Re-tailor only if the user added skills, so they now appear on the CV.
  const onQuestionsDone = (added) =>
    added ? runTailor({ skipQuestions: true }) : setStep("review");

  async function addSkill(skill) {
    await updateProfile.mutateAsync({ skills: [...(profile.skills ?? []), skill] });
  }

  async function saveAndDownload() {
    try {
      const cv =
        saved ??
        (await createCv.mutateAsync({
          templateId,
          jobId: jobId ?? null,
          title: title.trim(),
          content: draft.content,
        }));
      setSaved(cv);
      await downloadCv(cv);
      toast.success("CV saved and downloaded");
    } catch (error) {
      toastError(error, { onRetry: saveAndDownload });
    }
  }

  async function markApplied() {
    try {
      await createApplication.mutateAsync({ jobId, status: "applied", cvId: saved.id });
      toast.success("Marked as applied");
    } catch (error) {
      if (error.code === "CONFLICT")
        toast.message("This job is already in your tracker. Update its status there.");
      else toastError(error);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">
          {jobData ? `CV for ${jobData.title}` : "Create a general CV"}
        </h1>
        {jobData && <p className="text-muted-foreground">{jobData.company}</p>}
      </div>

      {step === "template" && (
        <div className="space-y-4">
          <TemplatePicker value={templateId} onChange={setTemplateId} />
          <Button onClick={runTailor}>Continue</Button>
        </div>
      )}
      {step === "tailoring" && (
        <p className="flex items-center gap-2" role="status">
          <Loader2 className="animate-spin" aria-hidden="true" />{" "}
          {jobData ? `Tailoring your CV for ${jobData.title}…` : "Building your CV…"}
        </p>
      )}
      {step === "questions" && draft && (
        <MissingQuestions
          missing={draft.missingRequirements}
          adding={updateProfile.isPending}
          onAdd={addSkill}
          onDone={onQuestionsDone}
        />
      )}
      {step === "review" && draft && (
        <div className="space-y-6">
          {draft.changes.length > 0 && (
            <Alert>
              <AlertDescription>
                <p className="font-medium">What changed for this job</p>
                <ul className="mt-1 list-disc pl-5">
                  {draft.changes.map((change) => (
                    <li key={change}>{change}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          <CvEditor
            content={draft.content}
            onChange={(content) => setDraft((prev) => ({ ...prev, content }))}
            templateId={templateId}
            profileSkills={profileSkillNames(profile)}
          />
          <div className="max-w-md space-y-2 rounded-lg border p-4">
            <Label htmlFor="cv-title">CV title</Label>
            <Input
              id="cv-title"
              value={title}
              maxLength={100}
              onChange={(event) => setTitle(event.target.value)}
            />
            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={saveAndDownload} disabled={!title.trim() || createCv.isPending}>
                {createCv.isPending ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <Download aria-hidden="true" />
                )}
                {saved ? "Download again" : "Save & download PDF"}
              </Button>
              {saved && (
                <Button variant="outline" onClick={() => router.push(`/cvs/${saved.id}`)}>
                  Keep editing
                </Button>
              )}
            </div>
            {saved && jobId && (
              <p className="pt-2 text-sm">
                Applied with this CV?{" "}
                <button type="button" className="font-medium underline" onClick={markApplied}>
                  Mark job as applied
                </button>
              </p>
            )}
            {saved && (
              <p className="text-sm text-muted-foreground">
                It&apos;s saved in{" "}
                <Link href="/cvs" className="underline">
                  My CVs
                </Link>
                , where you can download it any time.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
