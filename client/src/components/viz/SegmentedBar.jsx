// Tall segmented bar (dataviz "Figures"): one whole split into ≤6 parts, 28px tall, 4px corners, 2px gaps,
// each share printed inside where it fits, a legend of names (with icons: status colours never carry meaning
// alone) and a table view.
import { TableView } from "./TableView";

const MIN_SHARE_FOR_LABEL = 12;

export function SegmentedBar({ title, parts }) {
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  const visible = parts.filter((part) => part.value > 0);
  const share = (value) => (total ? Math.round((value / total) * 100) : 0);

  return (
    <figure aria-label={title}>
      {total === 0 ? (
        <div className="h-7 rounded-[4px] bg-muted" aria-hidden="true" />
      ) : (
        <div
          className="flex h-7 gap-[2px]"
          role="img"
          aria-label={`${title}: ${visible.map((part) => `${part.label} ${part.value} (${share(part.value)}%)`).join(", ")}`}
        >
          {visible.map((part) => (
            <div
              key={part.key}
              className={`group relative flex items-center rounded-[4px] px-2 text-xs font-medium ${part.fillClass} ${part.textClass}`}
              style={{ width: `${(part.value / total) * 100}%` }}
              title={`${part.label}: ${part.value} (${share(part.value)}%)`}
            >
              {share(part.value) >= MIN_SHARE_FOR_LABEL && `${share(part.value)}%`}
            </div>
          ))}
        </div>
      )}
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {parts.map(({ key, label, icon: Icon, fillClass }) => (
          <li key={key} className="inline-flex items-center gap-1.5">
            <span className={`size-2.5 rounded-[2px] ${fillClass}`} aria-hidden="true" />
            {Icon && <Icon className="size-3.5" aria-hidden="true" />}
            {label}
          </li>
        ))}
      </ul>
      <TableView
        caption={title}
        columns={["", "Jobs", "Share"]}
        rows={parts.map((part) => [part.label, part.value, `${share(part.value)}%`])}
      />
    </figure>
  );
}
