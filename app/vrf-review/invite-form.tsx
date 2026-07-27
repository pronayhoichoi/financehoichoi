"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inviteVendorAction, type VrfInviteState } from "./actions";

export function InviteForm() {
  const [state, formAction, pending] = useActionState<VrfInviteState, FormData>(
    inviteVendorAction,
    undefined,
  );

  return (
    <div className="rounded-md border p-4">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-medium">
            Vendor email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="vendor@example.com"
            className="w-72"
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Invite vendor"}
        </Button>
      </form>
      {state?.error && (
        <p className="mt-2 text-sm text-destructive">{state.error}</p>
      )}
      {state?.link && (
        <div className="mt-3 rounded-md bg-muted p-3 text-sm">
          <p className="font-medium">Invitation link (email stubbed to server logs):</p>
          <a href={state.link} className="break-all font-mono text-xs hover:underline">
            {state.link}
          </a>
        </div>
      )}
    </div>
  );
}
