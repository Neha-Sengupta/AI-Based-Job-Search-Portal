"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// Type a skill and press Enter (or comma). Duplicates are ignored case-insensitively (F2.11).
export function SkillChips({
  id,
  value = [],
  onChange,
  placeholder = "Type a skill and press Enter",
  max,
  suggestions = [],
}) {
  const [draft, setDraft] = useState("");
  const listId = suggestions.length ? `${id}-suggestions` : undefined;

  function add(raw) {
    const skill = raw.trim();
    if (!skill) return;
    if (
      !value.some((existing) => existing.toLowerCase() === skill.toLowerCase()) &&
      (!max || value.length < max)
    ) {
      onChange([...value, skill]);
    }
    setDraft("");
  }

  function onKeyDown(event) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add(draft);
    } else if (event.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Added skills">
          {value.map((skill) => (
            <li key={skill}>
              <Badge variant="secondary" className="gap-1 pr-1">
                {skill}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((item) => item !== skill))}
                  aria-label={`Remove ${skill}`}
                  className="rounded-full p-0.5 hover:bg-background"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
      <Input
        id={id}
        value={draft}
        list={listId}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => add(draft)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {listId && (
        <datalist id={listId}>
          {suggestions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      )}
    </div>
  );
}
