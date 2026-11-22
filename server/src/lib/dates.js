// Dates are stored as Date (UTC) and travel as "YYYY-MM-DD" strings.
export const toIsoDay = (value) => (value ? new Date(value).toISOString().slice(0, 10) : null);

export const startOfUtcDay = (date = new Date()) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
