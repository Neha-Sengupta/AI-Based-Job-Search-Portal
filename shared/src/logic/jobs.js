// Same job from two sources → same key.
const normalize = (value) =>
  (value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export function makeDedupeKey({ title, company, city }) {
  return [title, company, city].map(normalize).join("|");
}
