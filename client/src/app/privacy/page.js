import { ContentPage } from "@/components/ContentPage";

export const metadata = { title: "Privacy policy" };

// Must cover: data stored, AI processing, storage, account deletion, contact (F9.2). Review before launch.
export default function PrivacyPage() {
  return (
    <ContentPage title="Privacy policy" updated="21 November 2026">
      <p>
        This page explains what personal data Job Search Portal stores, why, and how you can delete
        it.
      </p>
      <h2>What we store</h2>
      <ul>
        <li>Your account: name, email address and a securely hashed password.</li>
        <li>
          Your profile: contact details, location, links, summary, skills, experience, education,
          projects, certifications and job preferences.
        </li>
        <li>Files you upload: your original CV and an optional photo.</li>
        <li>
          CVs you create, the jobs you save, your application statuses, notes and drafted answers.
        </li>
        <li>A daily count of the AI actions you use (to enforce the daily limit).</li>
      </ul>
      <h2>Where it&apos;s stored</h2>
      <p>
        Everything, including uploaded files, is stored in our database (MongoDB). Files are
        private: they are only sent to you, after we check they belong to your account. We never use
        the original file name.
      </p>
      <h2>AI processing</h2>
      <p>
        Your profile and the job description are sent to an AI provider (Groq){" "}
        <strong>only when you ask</strong> for drafted application answers, and only the fields
        needed for that. Your photo, email and phone number are never sent. Fit scores, tips, CV
        tailoring and CV reading use fixed rules on our own server, not AI.
      </p>
      <h2>Cookies</h2>
      <p>We use one essential cookie to keep you signed in. No advertising or tracking cookies.</p>
      <h2>Deleting your account</h2>
      <p>
        Go to Settings → Delete account. This permanently deletes your profile, CVs, uploaded files,
        tracker entries, AI usage records and your account.
      </p>
      <h2>Contact</h2>
      <p>
        Questions about your data? Contact the project team at the email address listed on the
        project&apos;s page.
      </p>
    </ContentPage>
  );
}
