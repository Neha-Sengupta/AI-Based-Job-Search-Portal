"use client";

// Small controlled inputs that convert between what the API stores and what an HTML input shows.
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// API: "YYYY-MM-DD" (first of the month). <input type="month">: "YYYY-MM".
export function MonthInput({ value, onChange, ...props }) {
  return (
    <Input
      type="month"
      value={value ? value.slice(0, 7) : ""}
      onChange={(event) => onChange(event.target.value ? `${event.target.value}-01` : null)}
      {...props}
    />
  );
}

// API: an array of strings. Textarea: one item per line.
export function LinesTextarea({ value, onChange, ...props }) {
  return (
    <Textarea
      value={(value ?? []).join("\n")}
      onChange={(event) => onChange(event.target.value.split("\n"))}
      onBlur={() => onChange((value ?? []).map((line) => line.trim()).filter(Boolean))}
      {...props}
    />
  );
}

// API: an array of strings. Input: comma-separated.
export function CommaListInput({ value, onChange, ...props }) {
  return (
    <Input
      value={(value ?? []).join(", ")}
      onChange={(event) => onChange(event.target.value.split(","))}
      onBlur={() => onChange((value ?? []).map((item) => item.trim()).filter(Boolean))}
      {...props}
    />
  );
}
