"use client";

import { Controller, useFieldArray } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { experienceStepSchema } from "shared/schemas/profile";
import { PROFILE_LIMITS } from "shared/constants/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FormField, fieldA11y } from "@/components/FormField";
import { LinesTextarea, MonthInput } from "@/components/FormInputs";
import { emptyExperience } from "../form-values";
import { errorAt, useProfileForm } from "./use-profile-form";
import { AutoFilledNote, FormActions } from "./FormActions";

export function ExperienceForm({ defaultValues, onSubmit, submitLabel, autoFilled, children }) {
  const { form, submit } = useProfileForm({
    schema: experienceStepSchema,
    defaultValues,
    onSubmit,
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "experience" });
  const { errors, isSubmitting } = form.formState;

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <AutoFilledNote show={autoFilled} />
      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No work experience yet? That&apos;s fine for freshers. Skip this step and add projects
          instead.
        </p>
      )}
      {fields.map((item, index) => {
        const id = (name) => `experience-${index}-${name}`;
        const err = (name) => errorAt(errors, `experience.${index}.${name}`);
        const current = form.watch(`experience.${index}.current`);
        return (
          <fieldset key={item.id} className="space-y-4 rounded-lg border p-4">
            <legend className="px-1 text-sm font-medium">Job {index + 1}</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id={id("title")} label="Job title" required error={err("title")}>
                <Input
                  {...fieldA11y(id("title"), { error: err("title") })}
                  {...form.register(`experience.${index}.title`)}
                />
              </FormField>
              <FormField id={id("company")} label="Company" required error={err("company")}>
                <Input
                  {...fieldA11y(id("company"), { error: err("company") })}
                  {...form.register(`experience.${index}.company`)}
                />
              </FormField>
            </div>
            <FormField id={id("location")} label="Location" error={err("location")}>
              <Input
                {...fieldA11y(id("location"))}
                {...form.register(`experience.${index}.location`)}
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id={id("start")} label="Start" required error={err("startDate")}>
                <Controller
                  control={form.control}
                  name={`experience.${index}.startDate`}
                  render={({ field }) => (
                    <MonthInput
                      {...fieldA11y(id("start"), { error: err("startDate") })}
                      {...field}
                    />
                  )}
                />
              </FormField>
              <FormField id={id("end")} label="End" error={err("endDate")}>
                <Controller
                  control={form.control}
                  name={`experience.${index}.endDate`}
                  render={({ field }) => (
                    <MonthInput
                      {...fieldA11y(id("end"), { error: err("endDate") })}
                      disabled={current}
                      {...field}
                    />
                  )}
                />
              </FormField>
            </div>
            <div className="flex items-center gap-2">
              <Controller
                control={form.control}
                name={`experience.${index}.current`}
                render={({ field }) => (
                  <Checkbox
                    id={id("current")}
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                )}
              />
              <Label htmlFor={id("current")}>I work here now</Label>
            </div>
            <FormField
              id={id("bullets")}
              label="What you did"
              hint={`One point per line, up to ${PROFILE_LIMITS.bullets}. Add numbers where you can.`}
              error={err("bullets")}
            >
              <Controller
                control={form.control}
                name={`experience.${index}.bullets`}
                render={({ field }) => (
                  <LinesTextarea rows={4} {...fieldA11y(id("bullets"))} {...field} />
                )}
              />
            </FormField>
            <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
              <Trash2 aria-hidden="true" /> Remove job
            </Button>
          </fieldset>
        );
      })}
      {fields.length < PROFILE_LIMITS.experience && (
        <Button type="button" variant="outline" onClick={() => append(emptyExperience())}>
          <Plus aria-hidden="true" /> Add a job
        </Button>
      )}
      <FormActions isSubmitting={isSubmitting} submitLabel={submitLabel}>
        {children}
      </FormActions>
    </form>
  );
}
