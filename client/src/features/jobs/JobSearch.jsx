"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { EmptyState, ErrorState } from "@/components/DataStates";
import { useSession } from "@/lib/auth-client";
import { useJobs } from "./api";
import { JobCard } from "./JobCard";
import { JobFilters } from "./JobFilters";

const LIST_KEYS = ["workModel", "jobType", "experienceLevel"];
const TEXT_KEYS = ["q", "country", "city", "postedWithin", "sort"];
const PAGE_SIZE = 20;

function readFilters(searchParams) {
  const filters = { page: Number(searchParams.get("page")) || 1 };
  for (const key of TEXT_KEYS) filters[key] = searchParams.get(key) ?? "";
  for (const key of LIST_KEYS) filters[key] = searchParams.getAll(key);
  return filters;
}

export function JobSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = readFilters(searchParams);
  const { data: session } = useSession();
  const signedIn = Boolean(session?.user);
  const { data, isPending, isFetching, error, refetch } = useJobs({ ...filters, limit: PAGE_SIZE });

  // Filters live in the URL, so a search survives a refresh and can be shared (F4.4).
  function update(changes, { keepPage = false } = {}) {
    const next = new URLSearchParams();
    const merged = { ...filters, ...changes, ...(keepPage ? {} : { page: 1 }) };
    for (const [key, value] of Object.entries(merged)) {
      for (const item of [].concat(value))
        if (item !== "" && item !== undefined && !(key === "page" && item === 1))
          next.append(key, item);
    }
    router.replace(`${pathname}?${next.toString()}`, { scroll: keepPage });
  }
  const clear = () => router.replace(pathname);

  const totalPages = data ? Math.max(1, Math.ceil(data.meta.total / PAGE_SIZE)) : 1;
  const filterPanel = (
    <JobFilters key={searchParams.toString()} filters={filters} onChange={update} onClear={clear} />
  );

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold">Jobs</h1>
      <form
        role="search"
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          update({ q: new FormData(event.currentTarget).get("q").toString().trim() });
        }}
      >
        <label htmlFor="job-q" className="sr-only">
          Search jobs
        </label>
        <Input
          id="job-q"
          name="q"
          defaultValue={filters.q}
          key={filters.q}
          placeholder="Job title, skill or company"
          maxLength={100}
        />
        <Button type="submit">
          <Search aria-hidden="true" /> Search
        </Button>
      </form>

      {!signedIn && (
        <p className="rounded-md bg-muted p-3 text-sm">
          <Link href="/signin?callbackUrl=/jobs" className="font-medium underline">
            Sign in
          </Link>{" "}
          to see how well you fit each job.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">
          {filterPanel}
        </aside>
        <section aria-label="Results" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {data ? `${data.meta.total} job${data.meta.total === 1 ? "" : "s"}` : " "}
              {isFetching && !isPending ? " · updating…" : ""}
            </p>
            <div className="flex items-center gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden">
                    <SlidersHorizontal aria-hidden="true" /> Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="px-4 pb-6">{filterPanel}</div>
                </SheetContent>
              </Sheet>
              <label htmlFor="job-sort" className="sr-only">
                Sort
              </label>
              <Select
                value={filters.sort || (filters.q ? "relevance" : "newest")}
                onValueChange={(value) => update({ sort: value })}
              >
                <SelectTrigger id="job-sort" size="sm" className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isPending && (
            <div className="space-y-3" aria-busy="true" aria-label="Loading jobs">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="h-28 w-full" />
              ))}
            </div>
          )}
          {error && <ErrorState error={error} onRetry={refetch} />}
          {data && data.data.length === 0 && (
            <EmptyState
              title="No jobs match these filters"
              description="Try fewer filters or a different search."
              action={<Button onClick={clear}>Clear filters</Button>}
            />
          )}
          {data && data.data.length > 0 && (
            <>
              <ul className="space-y-3">
                {data.data.map((job) => (
                  <li key={job.id}>
                    <JobCard job={job} signedIn={signedIn} />
                  </li>
                ))}
              </ul>
              <nav aria-label="Pagination" className="flex items-center justify-between">
                <Button
                  variant="outline"
                  disabled={filters.page <= 1}
                  onClick={() => update({ page: filters.page - 1 }, { keepPage: true })}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {filters.page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={filters.page >= totalPages}
                  onClick={() => update({ page: filters.page + 1 }, { keepPage: true })}
                >
                  Next
                </Button>
              </nav>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
