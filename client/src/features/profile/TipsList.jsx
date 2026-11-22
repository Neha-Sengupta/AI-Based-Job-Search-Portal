import Link from "next/link";
import { Lightbulb } from "lucide-react";

// Each tip links to the profile section it's about (F3.4).
const SECTION_BY_FIELD = { headline: "basics", summary: "basics", links: "basics" };
const sectionOf = (field) => {
  const first = field.split(".")[0];
  return SECTION_BY_FIELD[first] ?? first;
};

export function TipsList({ tips, limit }) {
  const shown = limit ? tips.slice(0, limit) : tips;
  if (shown.length === 0) {
    return <p className="text-sm text-muted-foreground">Looking good! No tips right now.</p>;
  }
  return (
    <ul className="space-y-2">
      {shown.map((tip) => (
        <li key={`${tip.id}-${tip.field}`} className="flex gap-2 text-sm">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden="true" />
          <Link href={`/profile#${sectionOf(tip.field)}`} className="hover:underline">
            {tip.tip}
          </Link>
        </li>
      ))}
    </ul>
  );
}
