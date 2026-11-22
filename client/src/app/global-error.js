"use client"; // Replaces the root layout when it fails, so it brings its own <html> and <body>.

export default function GlobalError({ retry }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center p-4 font-sans">
        <title>Something went wrong</title>
        <section role="alert" className="space-y-4 text-center">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <button
            type="button"
            onClick={() => retry()}
            className="rounded-md border px-4 py-2 font-medium"
          >
            Try again
          </button>
        </section>
      </body>
    </html>
  );
}
