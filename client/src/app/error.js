"use client"; // Error boundaries must be Client Components.

export default function Error({ retry }) {
  return (
    <section role="alert" className="space-y-4 py-12 text-center">
      <h1 className="font-heading text-2xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground">
        Please try again. If it keeps happening, come back in a few minutes.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90"
      >
        Try again
      </button>
    </section>
  );
}
