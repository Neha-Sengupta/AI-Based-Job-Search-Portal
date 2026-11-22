"use client";

import { Trash2 } from "lucide-react";
import { TEMPLATES } from "shared/constants/templates";
import { PROFILE_LIMITS } from "shared/constants/profile";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LinesTextarea } from "@/components/FormInputs";
import { SkillChips } from "@/components/SkillChips";
import { formatMonthRange } from "@/lib/format";
import { CvPreview } from "./CvPreview";

// Edits a CV's content (a snapshot of profile data). Only skills from the profile are offered (F7.6).
function ContentForm({ content, onChange, templateId, profileSkills }) {
  const supportsPhoto = TEMPLATES.find((template) => template.id === templateId)?.supportsPhoto;
  const set = (patch) => onChange({ ...content, ...patch });
  const setBasics = (patch) => set({ basics: { ...content.basics, ...patch } });
  const setListItem = (key, index, patch) =>
    set({
      [key]: content[key].map((item, position) =>
        position === index ? { ...item, ...patch } : item,
      ),
    });
  const removeItem = (key, index) =>
    set({ [key]: content[key].filter((_, position) => position !== index) });

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <Label htmlFor="cv-headline">Headline</Label>
        <Input
          id="cv-headline"
          value={content.basics.headline ?? ""}
          maxLength={PROFILE_LIMITS.headline}
          onChange={(event) => setBasics({ headline: event.target.value })}
        />
      </div>
      {supportsPhoto && (
        <div className="flex items-center gap-2">
          <Checkbox
            id="cv-photo"
            checked={content.basics.showPhoto}
            onCheckedChange={(checked) => setBasics({ showPhoto: checked === true })}
          />
          <Label htmlFor="cv-photo">Show my photo</Label>
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="cv-summary">Summary</Label>
        <Textarea
          id="cv-summary"
          rows={4}
          value={content.summary ?? ""}
          maxLength={PROFILE_LIMITS.summary}
          onChange={(event) => set({ summary: event.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cv-skills">Skills</Label>
        <SkillChips
          id="cv-skills"
          value={content.skills}
          onChange={(skills) =>
            set({
              skills: skills.filter((skill) =>
                profileSkills.some((known) => known.toLowerCase() === skill.toLowerCase()),
              ),
            })
          }
          suggestions={profileSkills}
          placeholder="Add a skill from your profile"
        />
        <p className="text-xs text-muted-foreground">
          Only skills from your profile can be added. Add new ones on your profile first.
        </p>
      </div>
      {content.experience.length > 0 && (
        <fieldset className="space-y-4">
          <legend className="font-heading font-semibold">Experience</legend>
          {content.experience.map((job, index) => (
            <div key={`${job.company}-${index}`} className="space-y-2 rounded-md border p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">
                  {job.title} · {job.company}
                  <span className="block text-xs font-normal text-muted-foreground">
                    {formatMonthRange(job.startDate, job.endDate, job.current)}
                  </span>
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem("experience", index)}
                  aria-label={`Remove ${job.company} from this CV`}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
              <Label htmlFor={`cv-exp-${index}`} className="text-xs">
                Bullet points (one per line)
              </Label>
              <LinesTextarea
                id={`cv-exp-${index}`}
                rows={4}
                value={job.bullets}
                onChange={(bullets) =>
                  setListItem("experience", index, {
                    bullets: bullets.slice(0, PROFILE_LIMITS.bullets),
                  })
                }
              />
            </div>
          ))}
        </fieldset>
      )}
      {content.projects.length > 0 && (
        <fieldset className="space-y-3">
          <legend className="font-heading font-semibold">Projects</legend>
          {content.projects.map((project, index) => (
            <div key={`${project.name}-${index}`} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{project.name}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem("projects", index)}
                  aria-label={`Remove ${project.name} from this CV`}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
              <Label htmlFor={`cv-proj-${index}`} className="text-xs">
                Highlights (one per line)
              </Label>
              <LinesTextarea
                id={`cv-proj-${index}`}
                rows={3}
                value={project.bullets}
                onChange={(bullets) =>
                  setListItem("projects", index, {
                    bullets: bullets.slice(0, PROFILE_LIMITS.bullets),
                  })
                }
              />
            </div>
          ))}
        </fieldset>
      )}
    </div>
  );
}

// Two panes on desktop, tabs on mobile (CV creator step 4).
export function CvEditor({ content, onChange, templateId, profileSkills }) {
  const form = (
    <ContentForm
      content={content}
      onChange={onChange}
      templateId={templateId}
      profileSkills={profileSkills}
    />
  );
  const preview = <CvPreview templateId={templateId} content={content} />;
  return (
    <>
      <div className="hidden gap-6 lg:grid lg:grid-cols-2">
        <div>{form}</div>
        <div className="sticky top-6 self-start">{preview}</div>
      </div>
      <Tabs defaultValue="edit" className="lg:hidden">
        <TabsList>
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        <TabsContent value="edit">{form}</TabsContent>
        <TabsContent value="preview">{preview}</TabsContent>
      </Tabs>
    </>
  );
}
