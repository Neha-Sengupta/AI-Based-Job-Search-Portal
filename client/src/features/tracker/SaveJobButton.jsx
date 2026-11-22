"use client";

import { useState } from "react";
import Link from "next/link";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toastError } from "@/lib/errors";
import { useCreateApplication } from "./api";

// Already in the tracker → a 409 just means "saved" (F8.2): show the existing entry, not an error.
export function SaveJobButton({ jobId, saved: initiallySaved = false }) {
  const [saved, setSaved] = useState(initiallySaved);
  const create = useCreateApplication();

  if (saved) {
    return (
      <Button asChild variant="ghost" size="sm">
        <Link href="/tracker">
          <BookmarkCheck aria-hidden="true" /> Saved
        </Link>
      </Button>
    );
  }
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={create.isPending}
      onClick={() =>
        create.mutate(
          { jobId },
          {
            onSuccess: () => setSaved(true),
            onError: (error) => (error.code === "CONFLICT" ? setSaved(true) : toastError(error)),
          },
        )
      }
    >
      <Bookmark aria-hidden="true" /> Save
    </Button>
  );
}
