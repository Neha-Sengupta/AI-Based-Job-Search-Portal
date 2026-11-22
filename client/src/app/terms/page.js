import { ContentPage } from "@/components/ContentPage";

export const metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <ContentPage title="Terms of use" updated="21 November 2026">
      <p>
        Job Search Portal is a free, non-commercial service. By using it you agree to these terms.
      </p>
      <h2>Your account</h2>
      <ul>
        <li>Keep your password safe. You&apos;re responsible for activity on your account.</li>
        <li>Only add information about yourself that is true.</li>
      </ul>
      <h2>Jobs</h2>
      <p>
        Jobs come from public job boards and companies&apos; own careers pages. We don&apos;t employ
        anyone or submit applications for you; you apply on the company&apos;s own site. Job details
        may be out of date.
      </p>
      <h2>Fit scores and CVs</h2>
      <p>
        Fit scores are estimates based on your profile and the job text. Always review a CV and any
        drafted answer before you use them.
      </p>
      <h2>Availability</h2>
      <p>The service is provided as is, without guarantees, and may change or stop at any time.</p>
    </ContentPage>
  );
}
