import { AlertTriangle, CheckCircle2, CircleDashed, XCircle } from "lucide-react";
import { FIT_VERDICT_LABELS } from "shared/constants/fit";
import { cn } from "@/lib/utils";

// Colour + icon + text, never colour alone.
const STYLES = {
  strong: {
    icon: CheckCircle2,
    className: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-100",
  },
  partial: {
    icon: AlertTriangle,
    className: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  },
  not_fit: {
    icon: XCircle,
    className: "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-100",
  },
};

export function FitBadge({ fit, size = "sm" }) {
  if (!fit) return null;
  if (fit.status) {
    const text =
      fit.status === "profile_incomplete" ? "Complete profile to see fit" : "Analysing this job…";
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        <CircleDashed className="size-3.5" aria-hidden="true" /> {text}
      </span>
    );
  }
  const { icon: Icon, className } = STYLES[fit.verdict];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        size === "lg" ? "px-3 py-1 text-base" : "px-2 py-0.5 text-xs",
        className,
      )}
    >
      <Icon className={size === "lg" ? "size-5" : "size-3.5"} aria-hidden="true" />
      {fit.score}% · {FIT_VERDICT_LABELS[fit.verdict]}
    </span>
  );
}
