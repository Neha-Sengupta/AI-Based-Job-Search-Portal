import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Stat tile contract (dataviz): label (sentence case) · value (semibold, proportional figures) · detail line.
export function StatTile({ label, value, detail, icon: Icon, children, className }) {
  return (
    <Card className={cn("gap-2 p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground sm:text-sm">{label}</p>
        {Icon && <Icon className="size-4 text-muted-foreground" aria-hidden="true" />}
      </div>
      <p className="text-2xl font-semibold tracking-tight sm:text-3xl">{value}</p>
      {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      {children}
    </Card>
  );
}

// One ratio against its limit: the fill and the unfilled track are steps of the same blue ramp.
export function Meter({ value, max = 100, label }) {
  const percent = Math.round((Math.min(value, max) / max) * 100);
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className="h-2 w-full overflow-hidden rounded-full bg-viz-series-1-track"
    >
      <div className="h-full rounded-full bg-viz-series-1" style={{ width: `${percent}%` }} />
    </div>
  );
}
