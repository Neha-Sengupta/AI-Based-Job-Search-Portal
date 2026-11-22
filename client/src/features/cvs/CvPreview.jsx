"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { usePreviewCv } from "./api";

const PREVIEW_DEBOUNCE_MS = 500;

// Server-rendered template HTML in a sandboxed iframe: no scripts, no same-origin access.
export function CvPreview({ templateId, content }) {
  const preview = usePreviewCv();
  const [html, setHtml] = useState(null);
  const { mutate } = preview;

  useEffect(() => {
    const timer = setTimeout(() => {
      mutate({ templateId, content }, { onSuccess: setHtml });
    }, PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [templateId, content, mutate]);

  if (!html) return <Skeleton className="aspect-[1/1.414] w-full" aria-label="Loading preview" />;
  return (
    <div className="relative">
      {preview.isError && (
        <p className="mb-2 text-sm text-destructive">
          The preview couldn&apos;t update: {preview.error.message}
        </p>
      )}
      <iframe
        title="CV preview"
        sandbox=""
        srcDoc={html}
        className="aspect-[1/1.414] w-full rounded-md border bg-white"
      />
    </div>
  );
}
