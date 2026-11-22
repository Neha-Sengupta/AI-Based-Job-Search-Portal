"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ErrorState } from "@/components/DataStates";
import { api } from "@/lib/api";
import { signOut, useSession } from "@/lib/auth-client";
import { toastError } from "@/lib/errors";
import { useUsage } from "@/features/tracker/api";
import { leaveToHome } from "@/components/SiteHeader";

const CONFIRM_WORD = "DELETE";

function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);

  async function deleteAccount() {
    setPending(true);
    try {
      await api.delete("/account");
      await signOut().catch(() => undefined); // the session is already gone on the server
      leaveToHome();
    } catch (error) {
      toastError(error);
      setPending(false);
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<Button variant="destructive">Delete my account</Button>}
      title="Delete your account?"
      description="This deletes your profile, CVs, uploaded files, tracker and everything else, permanently."
      confirmLabel="Delete everything"
      pending={pending || typed !== CONFIRM_WORD}
      onConfirm={deleteAccount}
    >
      <div className="space-y-1.5">
        <Label htmlFor="confirm-delete">Type {CONFIRM_WORD} to confirm</Label>
        <Input
          id="confirm-delete"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          autoComplete="off"
        />
      </div>
    </ConfirmDialog>
  );
}

export function SettingsPage() {
  const { data: session } = useSession();
  const usage = useUsage();
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-heading text-2xl font-semibold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="font-heading font-semibold">Account</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>{session?.user.name}</p>
          <p className="text-muted-foreground">{session?.user.email}</p>
          <p className="pt-2 text-xs text-muted-foreground">
            Changing your password or email is coming later.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="font-heading font-semibold">AI usage today</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {usage.isPending && <Skeleton className="h-5 w-64" />}
          {usage.error && <ErrorState error={usage.error} onRetry={usage.refetch} />}
          {usage.data && (
            <p>
              {usage.data.aiUsedToday} of {usage.data.aiDailyLimit} AI actions used, resets at
              midnight UTC.
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="font-heading font-semibold">Delete account</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Permanently delete your account and all your data.</p>
          <DeleteAccount />
        </CardContent>
      </Card>
    </div>
  );
}
