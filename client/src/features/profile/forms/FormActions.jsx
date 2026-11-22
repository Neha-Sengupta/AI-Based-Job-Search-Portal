import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Submit button (disabled with a spinner while saving, which prevents double submits) + optional extras.
export function FormActions({ isSubmitting, submitLabel = "Save", children }) {
  return (
    <div className="flex flex-wrap items-center gap-3 pt-2">
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
        {submitLabel}
      </Button>
      {children}
    </div>
  );
}

// Shown on the CV-upload path so users check what the parser filled in (F2.2).
export function AutoFilledNote({ show }) {
  if (!show) return null;
  return (
    <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
      We filled these fields from your CV. Please check each one and fix anything that&apos;s wrong.
    </p>
  );
}
