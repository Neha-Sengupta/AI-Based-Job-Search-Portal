"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toastError } from "@/lib/errors";
import { useCvs } from "@/features/cvs/api";
import { useCreateApplication, useUpdateApplication } from "@/features/tracker/api";

const OWN_CV = "own";

// After Apply, on return to the tab: "Did you apply?" → choose the CV → status Applied (F5.3).
export function DidYouApplyDialog({ open, onOpenChange, job }) {
  const [cvChoice, setCvChoice] = useState(OWN_CV);
  const { data: cvs } = useCvs({ jobId: job.id, limit: 20 });
  const create = useCreateApplication();
  const update = useUpdateApplication();
  const pending = create.isPending || update.isPending;

  async function markApplied() {
    const cvId = cvChoice === OWN_CV ? null : cvChoice;
    try {
      if (job.application)
        await update.mutateAsync({ id: job.application.id, status: "applied", cvId });
      else await create.mutateAsync({ jobId: job.id, status: "applied", cvId });
      toast.success("Marked as applied. Good luck!");
      onOpenChange(false);
    } catch (error) {
      toastError(error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Did you apply?</DialogTitle>
          <DialogDescription>
            We&apos;ll move {job.title} at {job.company} to Applied in your tracker.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="applied-cv">CV you used</Label>
          <Select value={cvChoice} onValueChange={setCvChoice}>
            <SelectTrigger id="applied-cv" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={OWN_CV}>My own CV</SelectItem>
              {cvs?.data.map((cv) => (
                <SelectItem key={cv.id} value={cv.id}>
                  {cv.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Not yet
          </Button>
          <Button onClick={markApplied} disabled={pending}>
            Yes, I applied
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
