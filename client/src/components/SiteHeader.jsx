"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { signOut, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const LOGGED_IN_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/jobs", label: "Jobs" },
  { href: "/cvs", label: "CVs" },
  { href: "/tracker", label: "Tracker" },
];
const LOGGED_OUT_LINKS = [{ href: "/jobs", label: "Jobs" }];

function NavLinks({ links, pathname, className, onNavigate }) {
  return links.map((link) => {
    const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
    return (
      <Link
        key={link.href}
        href={link.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn("text-sm hover:underline", active && "font-semibold", className)}
      >
        {link.label}
      </Link>
    );
  });
}

// A full reload (not client navigation) after signing out: open pages can't refetch with the dead session,
// and nothing from this user's data stays in memory for the next person on this browser.
export function leaveToHome() {
  window.location.replace("/");
}

function UserMenu({ user }) {
  async function handleSignOut() {
    await signOut();
    leaveToHome();
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Account menu">
          <UserRound aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="max-w-56 truncate">{user.name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleSignOut}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  const user = session?.user;
  const links = user ? LOGGED_IN_LINKS : LOGGED_OUT_LINKS;

  return (
    <header className="border-b">
      <nav aria-label="Main" className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <Link href={user ? "/dashboard" : "/"} className="font-heading text-lg font-semibold">
          Job Search Portal
        </Link>
        <div className="hidden items-center gap-6 sm:flex">
          <NavLinks links={links} pathname={pathname} />
        </div>
        <div className="ml-auto flex items-center gap-3">
          {!isPending && !user && (
            <>
              <Link href="/signin" className="text-sm hover:underline">
                Sign in
              </Link>
              <Button asChild size="sm">
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          )}
          {user && <UserMenu user={user} />}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="sm:hidden" aria-label="Open menu">
                <Menu aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4 px-4">
                <NavLinks links={links} pathname={pathname} className="text-base" />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
