"use client";

import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS } from "shared/constants/applications";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toastError } from "@/lib/errors";
import { useUpdateApplication } from "./api";

export function StatusSelect({ application, id = `status-${application.id}`, label = "Status" }) {
  const update = useUpdateApplication();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Select
        value={application.status}
        disabled={update.isPending}
        onValueChange={(status) =>
          update.mutate({ id: application.id, status }, { onError: (error) => toastError(error) })
        }
      >
        <SelectTrigger id={id} size="sm" className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {APPLICATION_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {APPLICATION_STATUS_LABELS[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
