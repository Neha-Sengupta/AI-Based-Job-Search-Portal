"use client";

import { useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

const COPIED_MS = 2000;

// Label · value · Copy. Shows "Copied" for 2 s; without clipboard access the text is selected instead (F10.2).
export function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);
  const valueRef = useRef(null);
  if (!value) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_MS);
    } catch {
      // Clipboard blocked (insecure context or permissions): select the text so the user can copy it.
      const range = document.createRange();
      range.selectNodeContents(valueRef.current);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
    }
  }

  return (
    <div className="flex items-start justify-between gap-3 border-b py-2 last:border-0">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p ref={valueRef} className="text-sm break-words whitespace-pre-line">
          {value}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={copy}
        aria-label={copied ? `${label} copied` : `Copy ${label}`}
      >
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
      </Button>
    </div>
  );
}
