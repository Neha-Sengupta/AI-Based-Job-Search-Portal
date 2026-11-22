"use client";

import { Controller, useFieldArray } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { skillsStepSchema } from "shared/schemas/profile";
import { PROFILE_LIMITS } from "shared/constants/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField, fieldA11y } from "@/components/FormField";
import { LinesTextarea, MonthInput } from "@/components/FormInputs";
import { SkillChips } from "@/components/SkillChips";
import { emptyCertification, emptyProject } from "../form-values";
import { errorAt, useProfileForm } from "./use-profile-form";
import { AutoFilledNote, FormActions } from "./FormActions";
import { SKILL_SUGGESTIONS } from "../skill-suggestions";

export function SkillsForm({ defaultValues, onSubmit, submitLabel, autoFilled, children }) {
  const { form, submit } = useProfileForm({ schema: skillsStepSchema, defaultValues, onSubmit });
  const projects = useFieldArray({ control: form.control, name: "projects" });
  const certifications = useFieldArray({ control: form.control, name: "certifications" });
  const { errors, isSubmitting } = form.formState;

  return (
    <form onSubmit={submit} noValidate className="space-y-8">
      <AutoFilledNote show={autoFilled} />
      <section aria-labelledby="skills-heading" className="space-y-2">
        <h3 id="skills-heading" className="font-heading font-semibold">
          Skills
        </h3>
        <FormField
          id="skills"
          label="Your skills"
          hint="Type a skill and press Enter."
          error={errors.skills?.message}
        >
          <Controller
            control={form.control}
            name="skills"
            render={({ field }) => (
              <SkillChips
                id="skills"
                value={field.value}
                onChange={field.onChange}
                max={PROFILE_LIMITS.skills}
                suggestions={SKILL_SUGGESTIONS}
              />
            )}
          />
        </FormField>
      </section>

      <section aria-labelledby="projects-heading" className="space-y-4">
        <h3 id="projects-heading" className="font-heading font-semibold">
          Projects
        </h3>
        {projects.fields.map((item, index) => {
          const id = (name) => `project-${index}-${name}`;
          const err = (name) => errorAt(errors, `projects.${index}.${name}`);
          return (
            <fieldset key={item.id} className="space-y-4 rounded-lg border p-4">
              <legend className="px-1 text-sm font-medium">Project {index + 1}</legend>
              <FormField id={id("name")} label="Name" required error={err("name")}>
                <Input
                  {...fieldA11y(id("name"), { error: err("name") })}
                  {...form.register(`projects.${index}.name`)}
                />
              </FormField>
              <FormField
                id={id("description")}
                label="Short description"
                error={err("description")}
              >
                <Textarea
                  rows={2}
                  {...fieldA11y(id("description"))}
                  {...form.register(`projects.${index}.description`)}
                />
              </FormField>
              <FormField
                id={id("bullets")}
                label="Highlights"
                hint="One point per line."
                error={err("bullets")}
              >
                <Controller
                  control={form.control}
                  name={`projects.${index}.bullets`}
                  render={({ field }) => (
                    <LinesTextarea rows={3} {...fieldA11y(id("bullets"))} {...field} />
                  )}
                />
              </FormField>
              <FormField id={id("skills")} label="Skills used" error={err("skills")}>
                <Controller
                  control={form.control}
                  name={`projects.${index}.skills`}
                  render={({ field }) => (
                    <SkillChips
                      id={id("skills")}
                      value={field.value}
                      onChange={field.onChange}
                      max={PROFILE_LIMITS.projectSkills}
                      suggestions={SKILL_SUGGESTIONS}
                    />
                  )}
                />
              </FormField>
              <FormField id={id("url")} label="Link" error={err("url")}>
                <Input
                  type="url"
                  placeholder="https://…"
                  {...fieldA11y(id("url"), { error: err("url") })}
                  {...form.register(`projects.${index}.url`)}
                />
              </FormField>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => projects.remove(index)}
              >
                <Trash2 aria-hidden="true" /> Remove project
              </Button>
            </fieldset>
          );
        })}
        {projects.fields.length < PROFILE_LIMITS.projects && (
          <Button type="button" variant="outline" onClick={() => projects.append(emptyProject())}>
            <Plus aria-hidden="true" /> Add a project
          </Button>
        )}
      </section>

      <section aria-labelledby="certifications-heading" className="space-y-4">
        <h3 id="certifications-heading" className="font-heading font-semibold">
          Certifications
        </h3>
        {certifications.fields.map((item, index) => {
          const id = (name) => `certification-${index}-${name}`;
          const err = (name) => errorAt(errors, `certifications.${index}.${name}`);
          return (
            <fieldset key={item.id} className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
              <legend className="px-1 text-sm font-medium">Certification {index + 1}</legend>
              <FormField id={id("name")} label="Name" required error={err("name")}>
                <Input
                  {...fieldA11y(id("name"), { error: err("name") })}
                  {...form.register(`certifications.${index}.name`)}
                />
              </FormField>
              <FormField id={id("issuer")} label="Issuer" error={err("issuer")}>
                <Input
                  {...fieldA11y(id("issuer"))}
                  {...form.register(`certifications.${index}.issuer`)}
                />
              </FormField>
              <FormField id={id("date")} label="Date" error={err("date")}>
                <Controller
                  control={form.control}
                  name={`certifications.${index}.date`}
                  render={({ field }) => <MonthInput {...fieldA11y(id("date"))} {...field} />}
                />
              </FormField>
              <FormField id={id("url")} label="Link" error={err("url")}>
                <Input
                  type="url"
                  {...fieldA11y(id("url"), { error: err("url") })}
                  {...form.register(`certifications.${index}.url`)}
                />
              </FormField>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="justify-self-start"
                onClick={() => certifications.remove(index)}
              >
                <Trash2 aria-hidden="true" /> Remove
              </Button>
            </fieldset>
          );
        })}
        {certifications.fields.length < PROFILE_LIMITS.certifications && (
          <Button
            type="button"
            variant="outline"
            onClick={() => certifications.append(emptyCertification())}
          >
            <Plus aria-hidden="true" /> Add a certification
          </Button>
        )}
      </section>

      <FormActions isSubmitting={isSubmitting} submitLabel={submitLabel}>
        {children}
      </FormActions>
    </form>
  );
}
