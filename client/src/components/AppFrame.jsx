"use client";

import { usePathname } from "next/navigation";
import { PROTECTED_PATHS } from "shared/constants/auth";
import { useSession } from "@/lib/auth-client";
import { AppShell } from "./AppShell";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

const isProtected = (pathname) =>
  PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

// Signed-in users get the dashboard shell (sidebar + top bar) everywhere; visitors get the public header/footer.
export function AppFrame({ children }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (isProtected(pathname) || session?.user) {
    return <AppShell user={session?.user}>{children}</AppShell>;
  }
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      <SiteFooter />
    </>
  );
}
