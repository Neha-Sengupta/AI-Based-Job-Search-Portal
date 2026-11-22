import { format, formatDistanceToNowStrict, parseISO } from "date-fns";

// "2022-01-01" → "Jan 2022"
export const formatMonth = (isoDate) => (isoDate ? format(parseISO(isoDate), "MMM yyyy") : "");

export function formatMonthRange(start, end, current) {
  const to = current ? "Present" : formatMonth(end);
  return [formatMonth(start), to].filter(Boolean).join(" – ");
}

// "2026-11-18T…" → "3 days ago"
export const timeAgo = (isoDate) =>
  isoDate ? `${formatDistanceToNowStrict(new Date(isoDate))} ago` : "";

const INR = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export function formatSalary(salary) {
  if (!salary) return null;
  const amount = (value) =>
    salary.currency === "INR" ? `₹${INR.format(value)}` : `${salary.currency} ${INR.format(value)}`;
  const range = [salary.min, salary.max]
    .filter((value) => value != null)
    .map(amount)
    .join(" – ");
  return range ? `${range} / ${salary.period}` : null;
}
