"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  setVendorStatusAction,
  uploadVendorDocumentAction,
} from "../actions";
import type { VendorStatus } from "@/app/generated/prisma/client";

const DOC_TYPES = [
  "PAN",
  "GST",
  "MSME",
  "CANCELLED_CHEQUE",
  "AGREEMENT",
  "OTHER",
] as const;

export function StatusControl({
  vendorId,
  current,
  canEdit,
}: {
  vendorId: string;
  current: VendorStatus;
  canEdit: boolean;
}) {
  const [status, setStatus] = useState<VendorStatus>(current);
  const [saving, setSaving] = useState(false);

  if (!canEdit) return <span className="text-sm">{current}</span>;

  return (
    <div className="flex items-center gap-2">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as VendorStatus)}
        className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
      >
        <option value="ACTIVE">Active</option>
        <option value="INACTIVE">Inactive</option>
        <option value="BLOCKED">Blocked</option>
      </select>
      <Button
        size="sm"
        variant="outline"
        disabled={saving || status === current}
        onClick={async () => {
          setSaving(true);
          await setVendorStatusAction(vendorId, status);
          setSaving(false);
        }}
      >
        {saving ? "Saving…" : "Update status"}
      </Button>
    </div>
  );
}

export function DocumentUpload({ vendorId }: { vendorId: string }) {
  const action = uploadVendorDocumentAction.bind(null, vendorId);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="type">Type</Label>
        <select
          id="type"
          name="type"
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          {DOC_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="file">File (PDF/JPG)</Label>
        <Input id="file" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="expiryDate">Expiry (optional)</Label>
        <Input id="expiryDate" name="expiryDate" type="date" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Uploading…" : "Upload"}
      </Button>
      {state?.error && (
        <p className="w-full text-sm text-destructive">{state.error}</p>
      )}
    </form>
  );
}
