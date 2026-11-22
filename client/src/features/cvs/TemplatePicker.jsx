import Image from "next/image";
import { TEMPLATES } from "shared/constants/templates";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function TemplatePicker({ value, onChange }) {
  return (
    <fieldset>
      <legend className="sr-only">Choose a template</legend>
      <div className="grid gap-4 sm:grid-cols-3">
        {TEMPLATES.map((template) => {
          const selected = value === template.id;
          return (
            <label
              key={template.id}
              className={cn(
                "cursor-pointer space-y-2 rounded-lg border p-3 focus-within:outline-2",
                selected && "border-primary ring-2 ring-primary",
              )}
            >
              <input
                type="radio"
                name="template"
                value={template.id}
                checked={selected}
                onChange={() => onChange(template.id)}
                className="sr-only"
              />
              <Image
                src={template.previewImage}
                alt={`${template.name} template preview`}
                width={600}
                height={849}
                className="w-full rounded border"
              />
              <span className="flex items-center gap-2 font-medium">
                {template.name}
                {template.supportsPhoto && <Badge variant="secondary">Photo</Badge>}
              </span>
              <span className="block text-xs text-muted-foreground">{template.description}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
