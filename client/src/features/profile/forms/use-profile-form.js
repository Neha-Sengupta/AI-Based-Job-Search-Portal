import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { handleFormError } from "@/lib/errors";

// React Hook Form + the shared schema; server field errors are mapped back under the inputs.
export function useProfileForm({ schema, defaultValues, onSubmit }) {
  const form = useForm({ resolver: zodResolver(schema), mode: "onBlur", defaultValues });
  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      handleFormError(form, error);
    }
  });
  return { form, submit };
}

// Error message for a dotted field path, e.g. "experience.0.title".
export const errorAt = (errors, path) =>
  path.split(".").reduce((node, key) => node?.[key], errors)?.message;
