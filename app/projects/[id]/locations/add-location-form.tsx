"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createLocationAction, type LocationState } from "./actions";

export function AddLocationForm({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState<LocationState, FormData>(
    createLocationAction.bind(null, projectId),
    undefined,
  );
  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-md border p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="name" className="text-xs">Name *</Label>
          <Input id="name" name="name" placeholder="Prinsep Ghat" />
        </div>
        <div className="flex flex-col gap-1 md:col-span-2">
          <Label htmlFor="address" className="text-xs">Address</Label>
          <Input id="address" name="address" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="contactName" className="text-xs">Contact name</Label>
          <Input id="contactName" name="contactName" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="contactPhone" className="text-xs">Contact phone</Label>
          <Input id="contactPhone" name="contactPhone" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="dayCost" className="text-xs">Day cost (₹)</Label>
          <Input id="dayCost" name="dayCost" type="number" step="0.01" />
        </div>
        <div className="flex flex-col gap-1 md:col-span-2">
          <Label htmlFor="permitNote" className="text-xs">Permit note</Label>
          <Input id="permitNote" name="permitNote" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="notes" className="text-xs">Notes</Label>
          <Input id="notes" name="notes" />
        </div>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add location"}
        </Button>
      </div>
    </form>
  );
}
