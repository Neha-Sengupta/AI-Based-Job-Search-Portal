import { Suspense } from "react";
import { AuthCard } from "@/components/AuthCard";
import { SignInForm } from "@/features/auth/SignInForm";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <AuthCard title="Sign in" description="Welcome back. Sign in to see your fit for every job.">
      {/* useSearchParams (callbackUrl) needs a Suspense boundary. */}
      <Suspense>
        <SignInForm />
      </Suspense>
    </AuthCard>
  );
}
