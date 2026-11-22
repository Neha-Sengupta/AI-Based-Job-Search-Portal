// Pure helpers that turn API data into dashboard figures (kept out of the components so they're testable).
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS } from "shared/constants/applications";

const DAY_MS = 24 * 60 * 60 * 1000;
export const ACTIVITY_DAYS = 14;

const dayKey = (date) => new Date(date).toISOString().slice(0, 10);

export function pipeline(applications) {
  return APPLICATION_STATUSES.map((status) => ({
    label: APPLICATION_STATUS_LABELS[status],
    value: applications.filter((item) => item.status === status).length,
  }));
}

// Tracker events (every status change, including the first "Saved") per day, oldest first.
export function activity(applications, now = new Date()) {
  const counts = new Map();
  for (const application of applications) {
    for (const event of application.history ?? []) {
      const key = dayKey(event.at);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return Array.from({ length: ACTIVITY_DAYS }, (_, index) => {
    const date = new Date(now.getTime() - (ACTIVITY_DAYS - 1 - index) * DAY_MS);
    const key = dayKey(date);
    return {
      label: date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      short:
        index % 2 === (ACTIVITY_DAYS - 1) % 2
          ? date.toLocaleDateString("en-IN", { day: "numeric" })
          : "",
      value: counts.get(key) ?? 0,
    };
  });
}

export function recentEvents(applications, limit = 5) {
  return applications
    .flatMap((application) =>
      (application.history ?? []).map((event) => ({
        id: `${application.id}-${event.at}-${event.status}`,
        status: event.status,
        at: event.at,
        job: application.job,
        jobId: application.jobId,
        jobAvailable: application.jobAvailable,
      })),
    )
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, limit);
}

export function appliedSince(applications, days, now = new Date()) {
  const since = now.getTime() - days * DAY_MS;
  return applications.filter((application) =>
    (application.history ?? []).some(
      (event) => event.status === "applied" && new Date(event.at).getTime() >= since,
    ),
  ).length;
}

export function fitSummary(jobs) {
  const scored = jobs.filter((job) => typeof job.fit?.score === "number");
  const count = (verdict) => scored.filter((job) => job.fit.verdict === verdict).length;
  return {
    average: scored.length
      ? Math.round(scored.reduce((sum, job) => sum + job.fit.score, 0) / scored.length)
      : null,
    strong: count("strong"),
    partial: count("partial"),
    notFit: count("not_fit"),
  };
}

export function greeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
