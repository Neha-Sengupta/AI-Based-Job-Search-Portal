"use client";

import { Controller, useFieldArray } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { educationStepSchema } from "shared/schemas/profile";
import { EDUCATION_LEVELS, EDUCATION_LEVEL_LABELS, PROFILE_LIMITS } from "shared/constants/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField, fieldA11y } from "@/components/FormField";
import { MonthInput } from "@/components/FormInputs";
import { emptyEducation } from "../form-values";
import { errorAt, useProfileForm } from "./use-profile-form";
import { AutoFilledNote, FormActions } from "./FormActions";

export function EducationForm({ defaultValues, onSubmit, submitLabel, autoFilled, children }) {
  const { form, submit } = useProfileForm({ schema: educationStepSchema, defaultValues, onSubmit });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "education" });
  const { errors, isSubmitting } = form.formState;

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <AutoFilledNote show={autoFilled} />
      {fields.map((item, index) => {
        const id = (name) => `education-${index}-${name}`;
        const err = (name) => errorAt(errors, `education.${index}.${name}`);
        return (
          <fieldset key={item.id} className="space-y-4 rounded-lg border p-4">
            <legend className="px-1 text-sm font-medium">Education {index + 1}</legend>
            <FormField
              id={id("institution")}
              label="College / school"
              required
              error={err("institution")}
            >
              <Input
                {...fieldA11y(id("institution"), { error: err("institution") })}
                {...form.register(`education.${index}.institution`)}
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id={id("level")} label="Level" required error={err("level")}>
                <Controller
                  control={form.control}
                  name={`education.${index}.level`}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id={id("level")} className="w-full">
                        <SelectValue placeholder="Choose a level" />
                      </SelectTrigger>
                      <SelectContent>
                        {EDUCATION_LEVELS.map((level) => (
                          <SelectItem key={level} value={level}>
                            {EDUCATION_LEVEL_LABELS[level]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField id={id("degree")} label="Degree" error={err("degree")}>
                <Input
                  placeholder="e.g. B.Tech"
                  {...fieldA11y(id("degree"))}
                  {...form.register(`education.${index}.degree`)}
                />
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id={id("field")} label="Field of study" error={err("field")}>
                <Input
                  placeholder="e.g. Computer Science"
                  {...fieldA11y(id("field"))}
                  {...form.register(`education.${index}.field`)}
                />
              </FormField>
              <FormField id={id("grade")} label="Grade" error={err("grade")}>
                <Input
                  placeholder="e.g. 8.4 CGPA or 86%"
                  {...fieldA11y(id("grade"))}
                  {...form.register(`education.${index}.grade`)}
                />
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id={id("start")} label="Start" error={err("startDate")}>
                <Controller
                  control={form.control}
                  name={`education.${index}.startDate`}
                  render={({ field }) => <MonthInput {...fieldA11y(id("start"))} {...field} />}
                />
              </FormField>
              <FormField id={id("end")} label="End (or expected)" error={err("endDate")}>
                <Controller
                  control={form.control}
                  name={`education.${index}.endDate`}
                  render={({ field }) => (
                    <MonthInput {...fieldA11y(id("end"), { error: err("endDate") })} {...field} />
                  )}
                />
              </FormField>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
              <Trash2 aria-hidden="true" /> Remove
            </Button>
          </fieldset>
        );
      })}
      {fields.length < PROFILE_LIMITS.education && (
        <Button type="button" variant="outline" onClick={() => append(emptyEducation())}>
          <Plus aria-hidden="true" /> Add education
        </Button>
      )}
      <FormActions isSubmitting={isSubmitting} submitLabel={submitLabel}>
        {children}
      </FormActions>
    </form>
  );
}
