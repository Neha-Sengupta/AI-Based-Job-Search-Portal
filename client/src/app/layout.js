import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { AppFrame } from "@/components/AppFrame";
import { Providers } from "./Providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata = {
  title: { default: "Job Search Portal", template: "%s · Job Search Portal" },
  description:
    "Know if you fit before you apply: one profile, a fit score for every job, and a CV tailored to each one.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Providers>
          {/* AppFrame reads the URL and the session, so it needs a Suspense boundary. */}
          <Suspense fallback={<div className="h-14 border-b" aria-hidden="true" />}>
            <AppFrame>{children}</AppFrame>
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
