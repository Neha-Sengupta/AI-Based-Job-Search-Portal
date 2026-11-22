"use client";

import { useRef } from "react";
import { toast } from "sonner";
import { Camera, Trash2 } from "lucide-react";
import { UPLOAD_LIMITS } from "shared/constants/limits";
import { Button } from "@/components/ui/button";
import { toastError } from "@/lib/errors";
import { useDeletePhoto, useUploadPhoto } from "./api";

const MAX_MB = UPLOAD_LIMITS.photoBytes / (1024 * 1024);

export function PhotoUploader({ photoUrl }) {
  const inputRef = useRef(null);
  const upload = useUploadPhoto();
  const remove = useDeletePhoto();

  function onFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > UPLOAD_LIMITS.photoBytes) {
      toast.error(`That photo is too large. The limit is ${MAX_MB} MB.`);
      return;
    }
    upload.mutate(file, {
      onSuccess: () => toast.success("Photo updated"),
      onError: (error) => toastError(error),
    });
  }

  return (
    <div className="flex items-center gap-4">
      {photoUrl ? (
        // The photo is served by our API after an ownership check, so next/image's optimiser can't fetch it.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt="Your profile photo"
          className="size-16 rounded-full object-cover"
        />
      ) : (
        <div
          className="flex size-16 items-center justify-center rounded-full bg-muted"
          aria-hidden="true"
        >
          <Camera className="size-6 text-muted-foreground" />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={onFile}
          id="photo-input"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
        >
          {photoUrl ? "Change photo" : "Add photo"}
        </Button>
        {photoUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => remove.mutate(undefined, { onError: (error) => toastError(error) })}
            disabled={remove.isPending}
          >
            <Trash2 aria-hidden="true" /> Remove
          </Button>
        )}
      </div>
      <p className="basis-full text-xs text-muted-foreground">
        Optional. JPG, PNG or WebP up to {MAX_MB} MB.
      </p>
    </div>
  );
}
