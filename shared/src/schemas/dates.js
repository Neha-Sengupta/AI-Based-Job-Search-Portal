import { z } from "zod";

// Dates travel as ISO "YYYY-MM-DD" strings (UTC). Month pickers send "YYYY-MM-01".
export const isoDate = () => z.iso.date("Use the format YYYY-MM-DD");

const today = () => new Date().toISOString().slice(0, 10);

// Date-range rules for experience/education entries:
// endDate >= startDate, current ⇒ endDate null, startDate not in the future.
export function refineDateRange(entry, ctx) {
  if (entry.startDate && entry.startDate > today()) {
    ctx.addIssue({
      code: "custom",
      path: ["startDate"],
      message: "Start date can't be in the future",
    });
  }
  if (!entry.current && entry.startDate && entry.endDate && entry.endDate < entry.startDate) {
    ctx.addIssue({
      code: "custom",
      path: ["endDate"],
      message: "End date must be after the start date",
    });
  }
}

// "current: true" always stores endDate as null (F2.10).
export const clearEndDateWhenCurrent = (entry) =>
  entry.current ? { ...entry, endDate: null } : entry;
