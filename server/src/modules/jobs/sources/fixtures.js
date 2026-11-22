// Offline source: ~200 India jobs captured once from the live APIs by
// server/scripts/capture-fixture-jobs.js. Used by `npm run db:seed` and offline development.
import { createCollector, readSourceJson } from "./adapter-utils.js";

export const name = "fixtures";

const FIXTURE_FILE = "__fixtures__/jobs.json";

// Dates are shifted so the newest job is "now": otherwise the 60-day cleanup would delete the
// seed data a few weeks after it was captured.
function shiftDates(items) {
  const newest = Math.max(...items.map((item) => Date.parse(item.postedAt) || 0));
  const offset = Date.now() - newest;
  return items.map((item) => ({
    ...item,
    postedAt: new Date(Date.parse(item.postedAt) + offset).toISOString(),
  }));
}

export async function fetchJobs({ maxJobs = 0, logger }) {
  const collector = createCollector({ source: name, maxJobs, logger });
  for (const item of shiftDates(await readSourceJson(FIXTURE_FILE))) {
    collector.add(item.sourceId, () => item);
  }
  return collector.result();
}
