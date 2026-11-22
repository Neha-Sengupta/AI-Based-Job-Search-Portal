import Link from "next/link";
import { ContentPage } from "@/components/ContentPage";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <ContentPage title="About Job Search Portal">
      <p>
        Job Search Portal helps job seekers in India know whether they fit a job before they apply,
        and send a CV that shows their best fit.
      </p>
      <h2>How it works</h2>
      <ul>
        <li>Build one profile, by filling in a form or uploading your CV.</li>
        <li>See a clear fit score for every job: what matches, and what&apos;s missing.</li>
        <li>Create a CV tailored to a job from your own profile. We never invent anything.</li>
        <li>Track every application in one place.</li>
      </ul>
      <h2>Fair and explainable</h2>
      <p>
        Fit scores, profile tips and CV tailoring use fixed rules, not AI, so the same profile
        always gets the same result. AI is only used when you ask it to draft answers to application
        questions.
      </p>
      <p>
        <Link href="/jobs" className="underline">
          Browse jobs
        </Link>
      </p>
    </ContentPage>
  );
}
