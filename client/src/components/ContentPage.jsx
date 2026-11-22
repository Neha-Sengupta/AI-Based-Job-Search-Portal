// Layout for static text pages (About, Privacy, Terms).
export function ContentPage({ title, updated, children }) {
  return (
    <article className="mx-auto max-w-prose space-y-4 py-4 text-sm leading-relaxed [&_h2]:mt-6 [&_h2]:font-heading [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc">
      <h1 className="font-heading text-2xl font-semibold">{title}</h1>
      {updated && <p className="text-xs text-muted-foreground">Last updated: {updated}</p>}
      {children}
    </article>
  );
}
