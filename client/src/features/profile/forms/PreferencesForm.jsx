"use client";

import { Controller } from "react-hook-form";
import { preferencesStepSchema } from "shared/schemas/profile";
import {
  COUNTRY_OPTIONS,
  JOB_TYPES,
  JOB_TYPE_LABELS,
  PROFILE_LIMITS,
  WORK_MODELS,
  WORK_MODEL_LABELS,
} from "shared/constants/profile";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/FormField";
import { SkillChips } from "@/components/SkillChips";
import { errorAt, useProfileForm } from "./use-profile-form";
import { FormActions } from "./FormActions";

function CheckboxGroup({ legend, name, options, control }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{legend}</legend>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {options.map(({ value, label }) => {
              const id = `${name}-${value}`.replaceAll(".", "-");
              const checked = field.value.includes(value);
              return (
                <div key={value} className="flex items-center gap-2">
                  <Checkbox
                    id={id}
                    checked={checked}
                    onCheckedChange={(next) =>
                      field.onChange(
                        next
                          ? [...field.value, value]
                          : field.value.filter((item) => item !== value),
                      )
                    }
                  />
                  <Label htmlFor={id}>{label}</Label>
                </div>
              );
            })}
          </div>
        )}
      />
    </fieldset>
  );
}

export function PreferencesForm({ defaultValues, onSubmit, submitLabel, children }) {
  const { form, submit } = useProfileForm({
    schema: preferencesStepSchema,
    defaultValues,
    onSubmit,
  });
  const { errors, isSubmitting } = form.formState;

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <FormField
        id="roles"
        label="Roles you're looking for"
        hint="e.g. Frontend Developer, Data Analyst. Press Enter after each."
        error={errorAt(errors, "preferences.roles")}
      >
        <Controller
          control={form.control}
          name="preferences.roles"
          render={({ field }) => (
            <SkillChips
              id="roles"
              value={field.value}
              onChange={field.onChange}
              max={PROFILE_LIMITS.roles}
              placeholder="Type a role and press Enter"
            />
          )}
        />
      </FormField>
      <CheckboxGroup
        legend="Work model"
        name="preferences.workModels"
        control={form.control}
        options={WORK_MODELS.map((value) => ({ value, label: WORK_MODEL_LABELS[value] }))}
      />
      <CheckboxGroup
        legend="Job type"
        name="preferences.jobTypes"
        control={form.control}
        options={JOB_TYPES.map((value) => ({ value, label: JOB_TYPE_LABELS[value] }))}
      />
      <CheckboxGroup
        legend="Countries"
        name="preferences.countries"
        control={form.control}
        options={COUNTRY_OPTIONS.map(({ code, name }) => ({ value: code, label: name }))}
      />
      <FormField
        id="min-salary"
        label="Minimum salary per year (INR, optional)"
        error={errorAt(errors, "preferences.minSalary.amount")}
      >
        <Controller
          control={form.control}
          name="preferences.minSalary"
          render={({ field }) => (
            <Input
              id="min-salary"
              type="number"
              inputMode="numeric"
              min={0}
              value={field.value?.amount ?? ""}
              onChange={(event) =>
                field.onChange(
                  event.target.value === ""
                    ? null
                    : { amount: Number(event.target.value), currency: "INR" },
                )
              }
            />
          )}
        />
      </FormField>
      <FormActions isSubmitting={isSubmitting} submitLabel={submitLabel}>
        {children}
      </FormActions>
    </form>
  );
}
