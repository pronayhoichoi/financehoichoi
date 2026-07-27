"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { VENDOR_CATEGORIES } from "@/lib/validation/vendor";
import type { VendorActionState } from "./actions";

type VendorFormDefaults = {
  legalName?: string;
  tradeName?: string | null;
  pan?: string;
  gstin?: string[];
  placeOfSupply?: string | null;
  placeOfInvoice?: string | null;
  msmeStatus?: boolean;
  addressLine?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  bankAccountNo?: string;
  bankName?: string;
  ifsc?: string;
  beneficiaryName?: string;
  category?: string;
  paymentTerms?: string | null;
  tdsSection?: string | null;
  lowerTdsFlag?: boolean;
  defaultLedger?: string | null;
};

function FieldError({
  errors,
  name,
}: {
  errors?: Record<string, string[]>;
  name: string;
}) {
  const msg = errors?.[name]?.[0];
  if (!msg) return null;
  return <p className="text-xs text-destructive">{msg}</p>;
}

export function VendorForm({
  action,
  defaults = {},
  submitLabel,
}: {
  action: (
    prev: VendorActionState,
    formData: FormData,
  ) => Promise<VendorActionState>;
  defaults?: VendorFormDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<
    VendorActionState,
    FormData
  >(action, {});
  const fe = state.fieldErrors;

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {state.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <h2 className="col-span-full text-sm font-semibold text-muted-foreground">
          Identity
        </h2>
        <div className="flex flex-col gap-2">
          <Label htmlFor="legalName">Legal name *</Label>
          <Input id="legalName" name="legalName" defaultValue={defaults.legalName ?? ""} />
          <FieldError errors={fe} name="legalName" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="tradeName">Trade name</Label>
          <Input id="tradeName" name="tradeName" defaultValue={defaults.tradeName ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="pan">PAN *</Label>
          <Input id="pan" name="pan" placeholder="ABCDE1234F" defaultValue={defaults.pan ?? ""} />
          <FieldError errors={fe} name="pan" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="gstin">GSTIN(s) — one per line</Label>
          <Textarea
            id="gstin"
            name="gstin"
            rows={2}
            defaultValue={(defaults.gstin ?? []).join("\n")}
          />
          <FieldError errors={fe} name="gstin" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="placeOfSupply">Place of supply</Label>
          <Input id="placeOfSupply" name="placeOfSupply" defaultValue={defaults.placeOfSupply ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="placeOfInvoice">Place of invoice</Label>
          <Input id="placeOfInvoice" name="placeOfInvoice" defaultValue={defaults.placeOfInvoice ?? ""} />
        </div>
        <label className="flex items-center gap-2">
          <Checkbox name="msmeStatus" defaultChecked={defaults.msmeStatus ?? false} />
          <span className="text-sm">MSME registered</span>
        </label>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <h2 className="col-span-full text-sm font-semibold text-muted-foreground">
          Address
        </h2>
        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="addressLine">Address</Label>
          <Input id="addressLine" name="addressLine" defaultValue={defaults.addressLine ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={defaults.city ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="state">State</Label>
          <Input id="state" name="state" defaultValue={defaults.state ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="pincode">Pincode</Label>
          <Input id="pincode" name="pincode" defaultValue={defaults.pincode ?? ""} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <h2 className="col-span-full text-sm font-semibold text-muted-foreground">
          Bank details
        </h2>
        <div className="flex flex-col gap-2">
          <Label htmlFor="bankAccountNo">Account number *</Label>
          <Input id="bankAccountNo" name="bankAccountNo" defaultValue={defaults.bankAccountNo ?? ""} />
          <FieldError errors={fe} name="bankAccountNo" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="bankName">Bank name *</Label>
          <Input id="bankName" name="bankName" defaultValue={defaults.bankName ?? ""} />
          <FieldError errors={fe} name="bankName" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ifsc">IFSC *</Label>
          <Input id="ifsc" name="ifsc" placeholder="ABCD0123456" defaultValue={defaults.ifsc ?? ""} />
          <FieldError errors={fe} name="ifsc" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="beneficiaryName">Beneficiary name *</Label>
          <Input id="beneficiaryName" name="beneficiaryName" defaultValue={defaults.beneficiaryName ?? ""} />
          <FieldError errors={fe} name="beneficiaryName" />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <h2 className="col-span-full text-sm font-semibold text-muted-foreground">
          Classification & tax
        </h2>
        <div className="flex flex-col gap-2">
          <Label htmlFor="category">Category *</Label>
          <select
            id="category"
            name="category"
            defaultValue={defaults.category ?? VENDOR_CATEGORIES[0]}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {VENDOR_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <FieldError errors={fe} name="category" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="paymentTerms">Payment terms</Label>
          <Input id="paymentTerms" name="paymentTerms" placeholder="e.g. Net 30" defaultValue={defaults.paymentTerms ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="tdsSection">TDS section</Label>
          <Input id="tdsSection" name="tdsSection" placeholder="e.g. 194C" defaultValue={defaults.tdsSection ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="defaultLedger">Default ledger</Label>
          <Input id="defaultLedger" name="defaultLedger" defaultValue={defaults.defaultLedger ?? ""} />
        </div>
        <label className="flex items-center gap-2">
          <Checkbox name="lowerTdsFlag" defaultChecked={defaults.lowerTdsFlag ?? false} />
          <span className="text-sm">Lower / NIL TDS certificate on file</span>
        </label>
      </section>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
