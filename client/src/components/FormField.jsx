import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Label + control + hint + error, with the ids wired for screen readers.
export function FormField({ id, label, required, hint, error, className, children }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required && (
          <span aria-hidden="true" className="text-destructive">
            {" "}
            *
          </span>
        )}
      </Label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

// Props for the input inside a FormField, so errors and hints are announced.
export function fieldA11y(id, { error, hint } = {}) {
  const describedBy = [error ? `${id}-error` : null, hint && !error ? `${id}-hint` : null].filter(
    Boolean,
  );
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy.length ? describedBy.join(" ") : undefined,
  };
}
