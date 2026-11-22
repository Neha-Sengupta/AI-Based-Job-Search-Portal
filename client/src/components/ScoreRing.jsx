import { cn } from "@/lib/utils";

// Profile completeness ring. The number is always shown as text too (not colour alone).
const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ScoreRing({ percent, label = "Profile score", className }) {
  const offset = CIRCUMFERENCE * (1 - Math.min(Math.max(percent, 0), 100) / 100);
  return (
    <div className={cn("relative inline-flex size-24 items-center justify-center", className)}>
      <svg
        viewBox="0 0 88 88"
        className="size-full -rotate-90"
        role="img"
        aria-label={`${label}: ${percent}%`}
      >
        <circle cx="44" cy="44" r={RADIUS} strokeWidth="8" className="fill-none stroke-muted" />
        <circle
          cx="44"
          cy="44"
          r={RADIUS}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          className="fill-none stroke-primary transition-[stroke-dashoffset]"
        />
      </svg>
      <span className="absolute font-heading text-xl font-semibold" aria-hidden="true">
        {percent}%
      </span>
    </div>
  );
}
