import { AuthCard } from "@/components/AuthCard";
import { SignUpForm } from "@/features/auth/SignUpForm";

export const metadata = { title: "Create an account" };

export default function SignUpPage() {
  return (
    <AuthCard
      title="Create your account"
      description="One profile, a fit score for every job, and a CV for each one."
    >
      <SignUpForm />
    </AuthCard>
  );
}
