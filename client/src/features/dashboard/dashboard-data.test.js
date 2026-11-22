import { describe, expect, it } from "vitest";
import { activity, appliedSince, fitSummary, pipeline, recentEvents } from "./dashboard-data.js";

const NOW = new Date("2026-11-21T12:00:00Z");
const applications = [
  {
    id: "a",
    jobId: "j1",
    status: "interview",
    job: { title: "Dev", company: "Acme" },
    history: [
      { status: "saved", at: "2026-11-18T10:00:00Z" },
      { status: "applied", at: "2026-11-19T10:00:00Z" },
      { status: "interview", at: "2026-11-21T09:00:00Z" },
    ],
  },
  {
    id: "b",
    jobId: "j2",
    status: "saved",
    job: { title: "QA", company: "Beta" },
    history: [{ status: "saved", at: "2026-11-21T08:00:00Z" }],
  },
];

describe("dashboard data", () => {
  it("counts the pipeline per status in tracker order", () => {
    expect(pipeline(applications).map((item) => item.value)).toEqual([1, 0, 1, 0, 0]);
  });

  it("counts tracker events per day over the last 14 days", () => {
    const days = activity(applications, NOW);
    expect(days).toHaveLength(14);
    expect(days.at(-1).value).toBe(2);
    expect(days.reduce((sum, day) => sum + day.value, 0)).toBe(4);
  });

  it("lists the newest events first", () => {
    expect(recentEvents(applications, 2).map((event) => event.status)).toEqual([
      "interview",
      "saved",
    ]);
  });

  it("counts applications applied in the last week", () => {
    expect(appliedSince(applications, 7, NOW)).toBe(1);
  });

  it("summarises fit verdicts and ignores jobs without a score", () => {
    const jobs = [
      { fit: { score: 80, verdict: "strong" } },
      { fit: { score: 60, verdict: "partial" } },
      { fit: { status: "requirements_pending" } },
    ];
    expect(fitSummary(jobs)).toEqual({ average: 70, strong: 1, partial: 1, notFit: 0 });
    expect(fitSummary([]).average).toBeNull();
  });
});
