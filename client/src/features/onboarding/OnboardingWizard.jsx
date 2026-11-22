"use client";

import { useEffect } from "react";
import Link from "next/link";
import { FileUp, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ErrorState, PageSkeleton } from "@/components/DataStates";
import { ScoreRing } from "@/components/ScoreRing";
import { useCreateProfile, useProfile, useUpdateProfile } from "@/features/profile/api";
import {
  basicsValues,
  educationValues,
  experienceValues,
  preferencesValues,
  skillsValues,
} from "@/features/profile/form-values";
import { BasicsForm } from "@/features/profile/forms/BasicsForm";
import { ExperienceForm } from "@/features/profile/forms/ExperienceForm";
import { EducationForm } from "@/features/profile/forms/EducationForm";
import { SkillsForm } from "@/features/profile/forms/SkillsForm";
import { PreferencesForm } from "@/features/profile/forms/PreferencesForm";
import { PhotoUploader } from "@/features/profile/PhotoUploader";
import { TipsList } from "@/features/profile/TipsList";
import { CvUploadStep } from "./CvUploadStep";
import { FORM_STEPS, STEPS, useOnboardingStore } from "./store";
import { rememberSavedStep, resumeStep } from "./resume-step";

const STEP_TITLES = {
  start: "Build your profile",
  upload: "Upload your CV",
  basics: "The basics",
  experience: "Work experience",
  education: "Education",
  skills: "Skills, projects and certifications",
  preferences: "What you're looking for",
  done: "Your profile is ready",
};

// The CV draft fills a section only while the saved profile's section is still empty.
const pickSource = (profile, draft, key) => (profile?.[key]?.length ? profile : (draft ?? profile));

function StartStep({ onChoose }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => onChoose("basics")}
        className="rounded-lg border p-6 text-left hover:border-primary focus-visible:outline-2"
      >
        <PencilLine className="size-6" aria-hidden="true" />
        <span className="mt-3 block font-heading font-semibold">Fill in a form</span>
        <span className="mt-1 block text-sm text-muted-foreground">
          Step by step, about 5 minutes.
        </span>
      </button>
      <button
        type="button"
        onClick={() => onChoose("upload")}
        className="rounded-lg border p-6 text-left hover:border-primary focus-visible:outline-2"
      >
        <FileUp className="size-6" aria-hidden="true" />
        <span className="mt-3 block font-heading font-semibold">Upload my CV</span>
        <span className="mt-1 block text-sm text-muted-foreground">
          We pre-fill the form from your PDF or DOCX. You check it.
        </span>
      </button>
    </div>
  );
}

function DoneStep({ profile }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-6">
        <ScoreRing percent={profile.completeness.percent} />
        <p className="max-w-prose text-sm text-muted-foreground">
          Your profile is {profile.completeness.percent}% complete. A fuller profile gives better
          fit scores and stronger CVs.
        </p>
      </div>
      <section aria-labelledby="tips-heading" className="space-y-2">
        <h2 id="tips-heading" className="font-heading font-semibold">
          Tips to improve
        </h2>
        <TipsList tips={profile.tips} />
      </section>
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href="/profile">Improve now</Link>
        </Button>
        <Button asChild>
          <Link href="/dashboard">Find jobs</Link>
        </Button>
      </div>
    </div>
  );
}

export function OnboardingWizard() {
  const { data: profile, isPending, error, refetch } = useProfile();
  const { step, setStep, cvDraft, uploadedCvFileId, clearCvDraft } = useOnboardingStore();
  const create = useCreateProfile();
  const update = useUpdateProfile();

  useEffect(() => {
    if (!isPending && !error && step === null) setStep(resumeStep(profile));
  }, [isPending, error, profile, step, setStep]);

  if (isPending || step === null) return <PageSkeleton />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const autoFilled = Boolean(cvDraft);
  const formIndex = FORM_STEPS.indexOf(step);
  const goNext = (current) => {
    rememberSavedStep(current);
    setStep(STEPS[STEPS.indexOf(current) + 1]);
  };
  const goBack = () => setStep(formIndex > 0 ? FORM_STEPS[formIndex - 1] : "start");
  const backButton = (
    <Button type="button" variant="ghost" onClick={goBack}>
      Back
    </Button>
  );
  const laterLink = (
    <Button asChild variant="link">
      <Link href="/dashboard">Save &amp; finish later</Link>
    </Button>
  );

  async function saveBasics(values) {
    if (profile) {
      await update.mutateAsync(values);
    } else {
      await create.mutateAsync({
        ...values,
        source: uploadedCvFileId ? "cv_upload" : "form",
        ...(uploadedCvFileId && { uploadedCvFileId }),
      });
    }
    goNext("basics");
  }

  const saveSection = (current) => async (values) => {
    await update.mutateAsync(values);
    if (current === "preferences") clearCvDraft();
    goNext(current);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        {formIndex >= 0 && (
          <>
            <p className="text-sm text-muted-foreground">
              Step {formIndex + 1} of {FORM_STEPS.length}
            </p>
            <Progress
              value={((formIndex + 1) / FORM_STEPS.length) * 100}
              aria-label="Onboarding progress"
            />
          </>
        )}
        <h1 className="font-heading text-2xl font-semibold">{STEP_TITLES[step]}</h1>
      </div>

      {step === "start" && <StartStep onChoose={setStep} />}
      {step === "upload" && (
        <CvUploadStep onDone={() => setStep("basics")} onUseForm={() => setStep("basics")} />
      )}
      {step === "basics" && (
        <div className="space-y-6">
          {profile && <PhotoUploader photoUrl={profile.photoUrl} />}
          <BasicsForm
            defaultValues={basicsValues(profile ?? cvDraft ?? {})}
            onSubmit={saveBasics}
            submitLabel="Save and continue"
            autoFilled={autoFilled && !profile}
          >
            {backButton}
          </BasicsForm>
          {!profile && (
            <p className="text-xs text-muted-foreground">
              You can add a photo from your profile page later (optional).
            </p>
          )}
        </div>
      )}
      {step === "experience" && (
        <ExperienceForm
          defaultValues={experienceValues(pickSource(profile, cvDraft, "experience"))}
          onSubmit={saveSection("experience")}
          submitLabel="Save and continue"
          autoFilled={autoFilled && !profile?.experience?.length}
        >
          {backButton}
          {laterLink}
        </ExperienceForm>
      )}
      {step === "education" && (
        <EducationForm
          defaultValues={educationValues(pickSource(profile, cvDraft, "education"))}
          onSubmit={saveSection("education")}
          submitLabel="Save and continue"
          autoFilled={autoFilled && !profile?.education?.length}
        >
          {backButton}
          {laterLink}
        </EducationForm>
      )}
      {step === "skills" && (
        <SkillsForm
          defaultValues={skillsValues({
            skills: pickSource(profile, cvDraft, "skills")?.skills,
            projects: pickSource(profile, cvDraft, "projects")?.projects,
            certifications: pickSource(profile, cvDraft, "certifications")?.certifications,
          })}
          onSubmit={saveSection("skills")}
          submitLabel="Save and continue"
          autoFilled={autoFilled && !profile?.skills?.length}
        >
          {backButton}
          {laterLink}
        </SkillsForm>
      )}
      {step === "preferences" && (
        <PreferencesForm
          defaultValues={preferencesValues(profile)}
          onSubmit={saveSection("preferences")}
          submitLabel="Finish"
        >
          {backButton}
        </PreferencesForm>
      )}
      {step === "done" && profile && <DoneStep profile={profile} />}
    </div>
  );
}
