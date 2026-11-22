"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { FIT_VERDICT_SENTENCES, FIT_WEIGHTS } from "shared/constants/fit";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toastError } from "@/lib/errors";
import { useProfile, useUpdateProfile } from "@/features/profile/api";
import { jobKeys } from "./api";
import { FitBadge } from "./FitBadge";

const PART_LABELS = {
  mustHave: "Must-have skills",
  experience: "Experience",
  niceToHave: "Nice-to-have skills",
  education: "Education",
  location: "Location / work model",
};

function FitBreakdown({ breakdown }) {
  return (
    <dl className="space-y-2">
      {Object.entries(PART_LABELS).map(([part, label]) => (
        <div key={part} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
          <dt className="text-sm">
            {label} <span className="text-xs text-muted-foreground">({FIT_WEIGHTS[part]}%)</span>
          </dt>
          <dd className="text-sm tabular-nums">{breakdown[part]}%</dd>
          <Progress
            value={breakdown[part]}
            className="col-span-2"
            aria-label={`${label}: ${breakdown[part]}%`}
          />
        </div>
      ))}
    </dl>
  );
}

// "I have this → add to profile": adds the skill, then refetches the job so the score updates (F6.8).
function AddSkillButton({ skill, jobId }) {
  const { data: profile } = useProfile();
  const update = useUpdateProfile();
  const queryClient = useQueryClient();
  if (!profile) return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={update.isPending}
      onClick={() =>
        update.mutate(
          { skills: [...profile.skills, skill] },
          {
            onSuccess: () => queryClient.invalidateQueries({ queryKey: jobKeys.detail(jobId) }),
            onError: (error) => toastError(error),
          },
        )
      }
    >
      <Plus aria-hidden="true" /> I have this
    </Button>
  );
}

export function FitPanel({ job }) {
  const { fit } = job;
  if (!fit) return null;
  if (fit.status === "profile_incomplete") {
    return (
      <p className="text-sm">
        <Link href="/profile#skills" className="font-medium underline">
          Complete your profile
        </Link>{" "}
        to see how well you fit this job.
      </p>
    );
  }
  if (fit.status)
    return (
      <p className="text-sm text-muted-foreground">
        Analysing this job… We couldn&apos;t find its requirements yet.
      </p>
    );

  const skills = new Set(fit.missingSkills ?? []);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <FitBadge fit={fit} size="lg" />
        <p className="text-sm">{FIT_VERDICT_SENTENCES[fit.verdict]}</p>
      </div>
      <FitBreakdown breakdown={fit.breakdown} />
      {fit.missing.length > 0 && (
        <div>
          <h3 className="text-sm font-medium">Missing</h3>
          <ul className="mt-1 space-y-1">
            {fit.missing.map((item) => (
              <li key={item} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>{item}</span>
                {skills.has(item) && <AddSkillButton skill={item} jobId={job.id} />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
