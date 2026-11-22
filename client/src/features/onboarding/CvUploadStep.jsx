"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { UPLOAD_LIMITS } from "shared/constants/limits";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUploadCv } from "@/features/profile/api";
import { cn } from "@/lib/utils";
import { useOnboardingStore } from "./store";

const MAX_MB = UPLOAD_LIMITS.cvBytes / (1024 * 1024);
const ACCEPT =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const uploadErrorMessage = (error) =>
  error.code === "PAYLOAD_TOO_LARGE"
    ? `That file is too large. The limit is ${MAX_MB} MB.`
    : error.message;

export function CvUploadStep({ onDone, onUseForm }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [problem, setProblem] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const upload = useUploadCv();
  const setCvDraft = useOnboardingStore((state) => state.setCvDraft);

  function send(file) {
    setProblem(null);
    if (file.size > UPLOAD_LIMITS.cvBytes) {
      setProblem(`That file is too large. The limit is ${MAX_MB} MB.`);
      return;
    }
    upload.mutate(file, {
      onSuccess: (result) => {
        setCvDraft(result);
        if (result.warnings.length) setWarnings(result.warnings);
        else onDone();
      },
      onError: (error) => setProblem(uploadErrorMessage(error)),
    });
  }

  if (warnings.length) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertDescription>
            <p className="font-medium">We read your CV, with a few notes:</p>
            <ul className="mt-2 list-disc pl-5">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
        <Button onClick={onDone}>Review the details</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) send(file);
        }}
        className={cn(
          "rounded-lg border-2 border-dashed p-8 text-center",
          dragging && "border-primary bg-muted",
        )}
      >
        {upload.isPending ? (
          <p className="flex items-center justify-center gap-2" role="status">
            <Loader2 className="animate-spin" aria-hidden="true" /> Reading your CV…
          </p>
        ) : (
          <>
            <FileUp className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
            <p className="mt-2 text-sm">Drag your CV here, or</p>
            <input
              ref={inputRef}
              id="cv-file"
              type="file"
              accept={ACCEPT}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) send(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="mt-2"
              onClick={() => inputRef.current?.click()}
            >
              Choose a file
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">PDF or DOCX, up to {MAX_MB} MB.</p>
          </>
        )}
      </div>
      {problem && (
        <Alert variant="destructive">
          <AlertDescription>
            {problem}{" "}
            <button type="button" className="font-medium underline" onClick={onUseForm}>
              Continue with the form instead
            </button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
