"use client";

import { Controller } from "react-hook-form";
import { basicsStepSchema } from "shared/schemas/profile";
import { COUNTRY_OPTIONS, PROFILE_LIMITS } from "shared/constants/profile";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField, fieldA11y } from "@/components/FormField";
import { useProfileForm } from "./use-profile-form";
import { AutoFilledNote, FormActions } from "./FormActions";

export function BasicsForm({ defaultValues, onSubmit, submitLabel, autoFilled, children }) {
  const { form, submit } = useProfileForm({ schema: basicsStepSchema, defaultValues, onSubmit });
  const { errors, isSubmitting } = form.formState;
  const field = (id, label, name, props = {}, { required, hint } = {}) => {
    const error = name.split(".").reduce((node, key) => node?.[key], errors)?.message;
    return (
      <FormField id={id} label={label} required={required} hint={hint} error={error}>
        <Input {...fieldA11y(id, { error, hint })} {...props} {...form.register(name)} />
      </FormField>
    );
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <AutoFilledNote show={autoFilled} />
      {field("fullName", "Full name", "fullName", { autoComplete: "name" }, { required: true })}
      {field("headline", "Headline", "headline", { placeholder: "e.g. Frontend Developer" })}
      <div className="grid gap-4 sm:grid-cols-2">
        {field("contactEmail", "Email", "contactEmail", { type: "email", autoComplete: "email" })}
        {field("phone", "Phone", "phone", {
          type: "tel",
          autoComplete: "tel",
          placeholder: "+91 98765 43210",
        })}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("city", "City", "location.city", { autoComplete: "address-level2" })}
        <FormField id="country" label="Country" error={errors.location?.country?.message}>
          <Controller
            control={form.control}
            name="location.country"
            render={({ field: { value, onChange } }) => (
              <Select value={value ?? ""} onValueChange={onChange}>
                <SelectTrigger id="country" className="w-full">
                  <SelectValue placeholder="Choose a country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_OPTIONS.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
      </div>
      {field("linkedin", "LinkedIn", "links.linkedin", {
        type: "url",
        placeholder: "https://linkedin.com/in/…",
      })}
      {field("github", "GitHub", "links.github", {
        type: "url",
        placeholder: "https://github.com/…",
      })}
      {field("portfolio", "Portfolio", "links.portfolio", {
        type: "url",
        placeholder: "https://…",
      })}
      <FormField
        id="summary"
        label="Summary"
        hint={`2–3 sentences about you and the role you want (max ${PROFILE_LIMITS.summary} characters).`}
        error={errors.summary?.message}
      >
        <Textarea
          rows={4}
          {...fieldA11y("summary", { error: errors.summary })}
          {...form.register("summary")}
        />
      </FormField>
      <FormActions isSubmitting={isSubmitting} submitLabel={submitLabel}>
        {children}
      </FormActions>
    </form>
  );
}
