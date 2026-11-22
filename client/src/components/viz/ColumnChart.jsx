// A single-series column chart (dataviz marks spec): ≤24px columns, 4px rounded tops, square at the baseline,
// hairline gridlines, value on the cap, a hover/focus tooltip per column, and a table view.
import { TableView } from "./TableView";

const GRID_STEPS = 4;

function niceMax(value) {
  if (value <= GRID_STEPS) return GRID_STEPS;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

export function ColumnChart({
  title,
  data,
  valueLabel = "Value",
  height = "h-40",
  showValues = true,
  formatLabel = (label) => label,
}) {
  const max = niceMax(Math.max(0, ...data.map((item) => item.value)));
  const ticks = Array.from({ length: GRID_STEPS + 1 }, (_, index) =>
    Math.round((max / GRID_STEPS) * index),
  );

  return (
    <figure aria-label={title} className="pt-3">
      <div className="flex gap-2">
        {/* y-axis ticks (muted text) */}
        <div
          className={`relative ${height} w-6 shrink-0 text-right text-[10px] text-muted-foreground tabular-nums`}
          aria-hidden="true"
        >
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 -translate-y-1/2"
              style={{ bottom: `${(tick / max) * 100}%` }}
            >
              {tick}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className={`relative ${height}`}>
            {ticks.slice(1).map((tick) => (
              <div
                key={tick}
                className="absolute inset-x-0 border-t border-viz-grid"
                style={{ bottom: `${(tick / max) * 100}%` }}
                aria-hidden="true"
              />
            ))}
            <div
              className="absolute inset-x-0 bottom-0 border-t border-viz-baseline"
              aria-hidden="true"
            />
            <ul className="absolute inset-0 flex items-end justify-around gap-[2px]">
              {data.map((item) => {
                const percent = (item.value / max) * 100;
                return (
                  <li
                    key={item.label}
                    className="group relative flex h-full flex-1 items-end justify-center"
                  >
                    <div
                      tabIndex={0}
                      aria-label={`${formatLabel(item.label)}: ${item.value}`}
                      className="relative flex h-full w-full max-w-6 items-end justify-center outline-none"
                    >
                      <div
                        className="w-full rounded-t-[4px] bg-viz-series-1 transition-opacity group-hover:opacity-80 group-focus-within:opacity-80"
                        style={{ height: `${percent}%`, minHeight: item.value ? "2px" : 0 }}
                      />
                      {showValues && item.value > 0 && (
                        <span
                          className="absolute text-[10px] font-medium text-foreground tabular-nums"
                          style={{ bottom: `calc(${percent}% + 2px)` }}
                        >
                          {item.value}
                        </span>
                      )}
                    </div>
                    <span
                      role="tooltip"
                      className="pointer-events-none absolute -top-8 z-10 hidden rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap shadow-sm group-focus-within:block group-hover:block"
                    >
                      <strong className="font-semibold">{item.value}</strong>{" "}
                      <span className="text-muted-foreground">{formatLabel(item.label)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          <ul
            className="mt-1 flex justify-around gap-[2px] text-[10px] text-muted-foreground"
            aria-hidden="true"
          >
            {data.map((item) => (
              <li key={item.label} className="flex-1 truncate text-center">
                {item.short ?? item.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <TableView
        caption={title}
        columns={["", valueLabel]}
        rows={data.map((item) => [formatLabel(item.label), item.value])}
      />
    </figure>
  );
}
