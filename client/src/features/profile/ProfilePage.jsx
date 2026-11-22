"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Download, Pencil } from "lucide-react";
import { COMPLETENESS_LABELS, COMPLETENESS_SECTIONS } from "shared/constants/completeness";
import {
  COUNTRY_OPTIONS,
  EDUCATION_LEVEL_LABELS,
  JOB_TYPE_LABELS,
  WORK_MODEL_LABELS,
} from "shared/constants/profile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState, PageSkeleton } from "@/components/DataStates";
import { ScoreRing } from "@/components/ScoreRing";
import { downloadFile } from "@/lib/download";
import { toastError } from "@/lib/errors";
import { formatMonthRange } from "@/lib/format";
import { useProfile, useUpdateProfile } from "./api";
import {
  basicsValues,
  educationValues,
  experienceValues,
  preferencesValues,
  skillsValues,
} from "./form-values";
import { BasicsForm } from "./forms/BasicsForm";
import { ExperienceForm } from "./forms/ExperienceForm";
import { EducationForm } from "./forms/EducationForm";
import { SkillsForm } from "./forms/SkillsForm";
import { PreferencesForm } from "./forms/PreferencesForm";
import { PhotoUploader } from "./PhotoUploader";
import { TipsList } from "./TipsList";

const countryName = (code) =>
  COUNTRY_OPTIONS.find((country) => country.code === code)?.name ?? code;
const listText = (items, labels) =>
  items?.length ? items.map((item) => labels[item] ?? item).join(", ") : "Not set";

function Section({ id, title, editing, onEdit, children }) {
  return (
    <Card id={id} className="scroll-mt-20">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>
          <h2 className="font-heading text-lg font-semibold">{title}</h2>
        </CardTitle>
        {!editing && (
          <Button variant="ghost" size="sm" onClick={onEdit} aria-label={`Edit ${title}`}>
            <Pencil aria-hidden="true" /> Edit
          </Button>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

const Empty = ({ children }) => <p className="text-sm text-muted-foreground">{children}</p>;

function BulletList({ items }) {
  if (!items?.length) return null;
  return (
    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function ProfilePage() {
  const { data: profile, isPending, error, refetch } = useProfile();
  const update = useUpdateProfile();
  const [editing, setEditing] = useState(null);

  if (isPending) return <PageSkeleton rows={6} />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const save = async (values) => {
    await update.mutateAsync(values);
    setEditing(null);
    toast.success("Saved");
  };
  const cancel = (
    <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
      Cancel
    </Button>
  );
  const section = (id, title, view, form) => (
    <Section id={id} title={title} editing={editing === id} onEdit={() => setEditing(id)}>
      {editing === id ? form : view}
    </Section>
  );
  const { completeness } = profile;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-semibold">Your profile</h1>

        {section(
          "basics",
          "Basics",
          <div className="space-y-4">
            <PhotoUploader photoUrl={profile.photoUrl} />
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[8rem_1fr]">
              <dt className="text-muted-foreground">Name</dt>
              <dd>{profile.fullName}</dd>
              <dt className="text-muted-foreground">Headline</dt>
              <dd>{profile.headline || "Not set"}</dd>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="break-all">{profile.contactEmail || "Not set"}</dd>
              <dt className="text-muted-foreground">Phone</dt>
              <dd>{profile.phone || "Not set"}</dd>
              <dt className="text-muted-foreground">Location</dt>
              <dd>
                {[
                  profile.location?.city,
                  profile.location?.country && countryName(profile.location.country),
                ]
                  .filter(Boolean)
                  .join(", ") || "Not set"}
              </dd>
              <dt className="text-muted-foreground">Links</dt>
              <dd className="break-all">
                {[profile.links?.linkedin, profile.links?.github, profile.links?.portfolio]
                  .filter(Boolean)
                  .join(" · ") || "Not set"}
              </dd>
            </dl>
            <div>
              <h3 className="text-sm font-medium">Summary</h3>
              <p className="mt-1 whitespace-pre-line text-sm">{profile.summary || "Not set"}</p>
            </div>
          </div>,
          <BasicsForm defaultValues={basicsValues(profile)} onSubmit={save}>
            {cancel}
          </BasicsForm>,
        )}

        {section(
          "experience",
          "Experience",
          profile.experience.length ? (
            <ul className="space-y-4">
              {profile.experience.map((job, index) => (
                <li key={`${job.company}-${index}`}>
                  <p className="font-medium">
                    {job.title} · {job.company}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatMonthRange(job.startDate, job.endDate, job.current)}
                  </p>
                  <BulletList items={job.bullets} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No experience added.</Empty>
          ),
          <ExperienceForm defaultValues={experienceValues(profile)} onSubmit={save}>
            {cancel}
          </ExperienceForm>,
        )}

        {section(
          "education",
          "Education",
          profile.education.length ? (
            <ul className="space-y-3">
              {profile.education.map((item, index) => (
                <li key={`${item.institution}-${index}`}>
                  <p className="font-medium">{item.institution}</p>
                  <p className="text-sm">
                    {[item.degree || EDUCATION_LEVEL_LABELS[item.level], item.field, item.grade]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {item.startDate && (
                    <p className="text-xs text-muted-foreground">
                      {formatMonthRange(item.startDate, item.endDate, item.current)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No education added.</Empty>
          ),
          <EducationForm defaultValues={educationValues(profile)} onSubmit={save}>
            {cancel}
          </EducationForm>,
        )}

        {section(
          "skills",
          "Skills, projects and certifications",
          <div className="space-y-4">
            {profile.skills.length ? (
              <ul className="flex flex-wrap gap-2" aria-label="Skills">
                {profile.skills.map((skill) => (
                  <li key={skill}>
                    <Badge variant="secondary">{skill}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No skills added.</Empty>
            )}
            <div id="projects" className="scroll-mt-20">
              <h3 className="text-sm font-medium">Projects</h3>
              {profile.projects.length ? (
                <ul className="mt-2 space-y-3">
                  {profile.projects.map((project, index) => (
                    <li key={`${project.name}-${index}`}>
                      <p className="font-medium">{project.name}</p>
                      {project.description && <p className="text-sm">{project.description}</p>}
                      <BulletList items={project.bullets} />
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>No projects added.</Empty>
              )}
            </div>
            {profile.certifications.length > 0 && (
              <div>
                <h3 className="text-sm font-medium">Certifications</h3>
                <ul className="mt-1 list-disc pl-5 text-sm">
                  {profile.certifications.map((item, index) => (
                    <li key={`${item.name}-${index}`}>
                      {[item.name, item.issuer].filter(Boolean).join(" · ")}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>,
          <SkillsForm defaultValues={skillsValues(profile)} onSubmit={save}>
            {cancel}
          </SkillsForm>,
        )}

        {section(
          "preferences",
          "Job preferences",
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[8rem_1fr]">
            <dt className="text-muted-foreground">Roles</dt>
            <dd>{profile.preferences.roles.join(", ") || "Not set"}</dd>
            <dt className="text-muted-foreground">Work model</dt>
            <dd>{listText(profile.preferences.workModels, WORK_MODEL_LABELS)}</dd>
            <dt className="text-muted-foreground">Job type</dt>
            <dd>{listText(profile.preferences.jobTypes, JOB_TYPE_LABELS)}</dd>
            <dt className="text-muted-foreground">Countries</dt>
            <dd>{profile.preferences.countries.map(countryName).join(", ") || "Not set"}</dd>
          </dl>,
          <PreferencesForm defaultValues={preferencesValues(profile)} onSubmit={save}>
            {cancel}
          </PreferencesForm>,
        )}

        <Card id="uploaded-cv">
          <CardHeader>
            <CardTitle>
              <h2 className="font-heading text-lg font-semibold">Your uploaded CV</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profile.uploadedCvFileId ? (
              <Button
                variant="outline"
                onClick={() =>
                  downloadFile("/profile/cv-download", "cv.pdf").catch((downloadError) =>
                    toastError(downloadError),
                  )
                }
              >
                <Download aria-hidden="true" /> Download my CV
              </Button>
            ) : (
              <Empty>
                You haven&apos;t uploaded a CV. You can create tailored CVs from any job.
              </Empty>
            )}
          </CardContent>
        </Card>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start" aria-labelledby="score-heading">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2 id="score-heading" className="font-heading font-semibold">
                Profile score
              </h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScoreRing percent={completeness.percent} />
            {[...completeness.missingRequired, ...completeness.missingRecommended].length > 0 && (
              <div>
                <h3 className="text-sm font-medium">Missing</h3>
                <ul className="mt-1 space-y-1 text-sm">
                  {[...completeness.missingRequired, ...completeness.missingRecommended].map(
                    (field) => (
                      <li key={field}>
                        <Link href={`#${COMPLETENESS_SECTIONS[field]}`} className="hover:underline">
                          {COMPLETENESS_LABELS[field]}
                          {completeness.missingRequired.includes(field) && (
                            <span className="text-destructive"> (required)</span>
                          )}
                        </Link>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium">Tips</h3>
              <div className="mt-1">
                <TipsList tips={profile.tips} />
              </div>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
