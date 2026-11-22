"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Briefcase,
  FileText,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Search,
  Settings,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/cvs", label: "My CVs", icon: FileText },
  { href: "/tracker", label: "Tracker", icon: ListChecks },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/settings", label: "Settings", icon: Settings },
];

// A full reload after signing out: open pages can't refetch with the dead session, and none of this user's
// data stays in memory for the next person on this browser.
export async function signOutAndLeave() {
  await signOut();
  window.location.replace("/");
}

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

function NavList({ pathname, onNavigate }) {
  return (
    <ul className="space-y-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                active && "bg-muted font-medium text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function UserCard({ user }) {
  return (
    <div className="flex items-center gap-3 border-t p-3">
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
        aria-hidden="true"
      >
        {initials(user?.name) || "…"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user?.name ?? " "}</p>
        <p className="truncate text-xs text-muted-foreground">{user?.email ?? " "}</p>
      </div>
      <Button variant="ghost" size="icon" onClick={signOutAndLeave} aria-label="Sign out">
        <LogOut aria-hidden="true" />
      </Button>
    </div>
  );
}

function Brand() {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-2 px-3 font-heading text-base font-semibold"
    >
      <span
        className="flex size-7 items-center justify-center rounded-md bg-primary text-xs text-primary-foreground"
        aria-hidden="true"
      >
        JS
      </span>
      Job Search Portal
    </Link>
  );
}

function TopSearch() {
  const router = useRouter();
  return (
    <form
      role="search"
      className="relative w-full max-w-md"
      onSubmit={(event) => {
        event.preventDefault();
        const q = new FormData(event.currentTarget).get("q").toString().trim();
        router.push(q ? `/jobs?q=${encodeURIComponent(q)}` : "/jobs");
      }}
    >
      <label htmlFor="shell-search" className="sr-only">
        Search jobs
      </label>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        id="shell-search"
        name="q"
        placeholder="Search jobs, skills or companies"
        className="pl-9"
        maxLength={100}
      />
    </form>
  );
}

export function AppShell({ user, children }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-screen bg-muted/40">
      <aside
        className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-background lg:flex"
        aria-label="Sidebar"
      >
        <div className="py-4">
          <Brand />
        </div>
        <nav aria-label="Main" className="flex-1 overflow-y-auto px-3">
          <NavList pathname={pathname} />
        </nav>
        <UserCard user={user} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-64 flex-col p-0">
              <SheetHeader className="py-4">
                <SheetTitle asChild>
                  <div>
                    <Brand />
                  </div>
                </SheetTitle>
              </SheetHeader>
              <nav aria-label="Mobile" className="flex-1 px-3">
                <NavList pathname={pathname} />
              </nav>
              <UserCard user={user} />
            </SheetContent>
          </Sheet>
          <TopSearch />
          <div className="ml-auto flex items-center gap-2">
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="/cvs/new">
                <FileText aria-hidden="true" /> New CV
              </Link>
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
