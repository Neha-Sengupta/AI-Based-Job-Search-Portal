import Link from "next/link";

export function AuthLegalNote() {
  return (
    <p className="text-center text-xs text-muted-foreground">
      By continuing you agree to our{" "}
      <Link href="/terms" className="underline">
        Terms
      </Link>{" "}
      and{" "}
      <Link href="/privacy" className="underline">
        Privacy policy
      </Link>
      .
    </p>
  );
}
