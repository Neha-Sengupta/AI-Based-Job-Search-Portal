"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { signUpSchema } from "shared/schemas/auth";
import { PASSWORD_MIN_LENGTH } from "shared/constants/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormField, fieldA11y } from "@/components/FormField";
import { PasswordInput } from "@/components/PasswordInput";
import { signUp } from "@/lib/auth-client";
import { authErrorMessage } from "./auth-messages";
import { AuthLegalNote } from "./AuthLegalNote";

const PASSWORD_HINT = `At least ${PASSWORD_MIN_LENGTH} characters`;

export function SignUpForm() {
  const router = useRouter();
  const [formError, setFormError] = useState(null);
  const form = useForm({
    resolver: zodResolver(signUpSchema),
    mode: "onBlur",
    defaultValues: { name: "", email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values) {
    setFormError(null);
    const { error } = await signUp.email(values);
    if (error) {
      setFormError({
        message: authErrorMessage(error),
        exists: error.code?.startsWith("USER_ALREADY_EXISTS"),
      });
      return;
    }
    router.replace("/onboarding");
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>
            {formError.message}
            {formError.exists && (
              <>
                {" "}
                <Link href="/signin" className="font-medium underline">
                  Sign in
                </Link>
              </>
            )}
          </AlertDescription>
        </Alert>
      )}
      <FormField id="name" label="Name" error={errors.name?.message}>
        <Input
          autoComplete="name"
          {...fieldA11y("name", { error: errors.name })}
          {...form.register("name")}
        />
      </FormField>
      <FormField id="email" label="Email" error={errors.email?.message}>
        <Input
          type="email"
          autoComplete="email"
          {...fieldA11y("email", { error: errors.email })}
          {...form.register("email")}
        />
      </FormField>
      <FormField
        id="password"
        label="Password"
        hint={PASSWORD_HINT}
        error={errors.password?.message}
      >
        <PasswordInput
          autoComplete="new-password"
          {...fieldA11y("password", { error: errors.password, hint: PASSWORD_HINT })}
          {...form.register("password")}
        />
      </FormField>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
        Create account
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/signin" className="font-medium text-foreground underline">
          Sign in
        </Link>
      </p>
      <AuthLegalNote />
    </form>
  );
}
