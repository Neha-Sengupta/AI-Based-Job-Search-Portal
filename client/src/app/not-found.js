import Link from "next/link";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <section className="space-y-4 py-12 text-center">
      <h1 className="font-heading text-2xl font-semibold">We couldn&apos;t find that page</h1>
      <p className="text-muted-foreground">The link may be old, or the page may have moved.</p>
      <Link href="/jobs" className="inline-block font-medium underline">
        Browse jobs
      </Link>
    </section>
  );
}
