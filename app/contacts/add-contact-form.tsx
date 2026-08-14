"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createContactAction, type ContactState } from "./actions";

type Vendor = { id: string; vendorCode: string; legalName: string };

export function AddContactForm({ vendors }: { vendors: Vendor[] }) {
  const [state, formAction, pending] = useActionState<ContactState, FormData>(
    createContactAction,
    undefined,
  );
  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-md border p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="name" className="text-xs">Name *</Label>
          <Input id="name" name="name" placeholder="Anindya Sen" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="role" className="text-xs">Role</Label>
          <Input id="role" name="role" placeholder="DOP" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="department" className="text-xs">Department</Label>
          <Input id="department" name="department" placeholder="Camera" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="email" className="text-xs">Email</Label>
          <Input id="email" name="email" type="email" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="phone" className="text-xs">Phone</Label>
          <Input id="phone" name="phone" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="vendorId" className="text-xs">Linked vendor (payee)</Label>
          <select
            id="vendorId"
            name="vendorId"
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            defaultValue=""
          >
            <option value="">— none —</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.vendorCode} — {v.legalName}
              </option>
            ))}
          </select>
        </div>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add contact"}
        </Button>
      </div>
    </form>
  );
}
