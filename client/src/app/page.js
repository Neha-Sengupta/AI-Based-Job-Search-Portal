import Link from "next/link";
import { CheckCircle2, FileText, Search, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STEPS = [
  {
    icon: UserRound,
    title: "Build your profile",
    text: "Fill in a form or upload your CV. One profile for every application.",
  },
  {
    icon: CheckCircle2,
    title: "See your fit",
    text: "Every job shows a fit score, what matches and what's missing.",
  },
  {
    icon: FileText,
    title: "Get a tailored CV",
    text: "A CV for each job, from your own profile. Nothing invented.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-16 py-8">
      <section className="space-y-6 text-center">
        <h1 className="font-heading text-3xl font-semibold sm:text-5xl">
          Know if you fit before you apply
        </h1>
        <p className="mx-auto max-w-prose text-muted-foreground">
          Jobs from companies hiring in India, a clear fit score for each one, and a CV tailored to
          every job.
        </p>
        <form action="/jobs" role="search" className="mx-auto flex max-w-xl gap-2">
          <label htmlFor="home-q" className="sr-only">
            Search jobs
          </label>
          <Input id="home-q" name="q" placeholder="Job title, skill or company" maxLength={100} />
          <Button type="submit">
            <Search aria-hidden="true" /> Search
          </Button>
        </form>
        <Button asChild size="lg">
          <Link href="/signup">Get started</Link>
        </Button>
      </section>

      <section aria-labelledby="how-heading" className="space-y-6">
        <h2 id="how-heading" className="text-center font-heading text-2xl font-semibold">
          How it works
        </h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, index) => (
            <li key={title} className="space-y-2 rounded-lg border p-5">
              <Icon className="size-6" aria-hidden="true" />
              <h3 className="font-heading font-semibold">
                {index + 1}. {title}
              </h3>
              <p className="text-sm text-muted-foreground">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="why-heading" className="mx-auto max-w-prose space-y-3">
        <h2 id="why-heading" className="font-heading text-2xl font-semibold">
          Honest by design
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>Fit scores use clear rules, so you always see why.</li>
          <li>Tailored CVs only reorder and select your own information.</li>
          <li>Your data is private and you can delete it any time.</li>
        </ul>
      </section>
    </div>
  );
}
