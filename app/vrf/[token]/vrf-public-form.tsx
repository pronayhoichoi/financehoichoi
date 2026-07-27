"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { VENDOR_CATEGORIES } from "@/lib/validation/vendor";
import { VRF_DOC_SLOTS } from "@/lib/validation/vrf";
import { submitVrfAction, type VrfSubmitState } from "./actions";

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

export function VrfPublicForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<VrfSubmitState, FormData>(
    submitVrfAction.bind(null, token),
    undefined,
  );
  const fe = state?.fieldErrors;

  if (state?.success) {
    return (
      <div className="rounded-md border border-green-300 bg-green-50 p-6 text-center dark:bg-green-950/30">
        <h2 className="text-lg font-semibold">Submitted — thank you</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Our finance team will review your details and get back to you.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {state?.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <h2 className="col-span-full text-sm font-semibold text-muted-foreground">
          Business identity
        </h2>
        <div className="flex flex-col gap-2">
          <Label htmlFor="legalName">Legal name *</Label>
          <Input id="legalName" name="legalName" />
          <FieldError errors={fe} name="legalName" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="tradeName">Trade name</Label>
          <Input id="tradeName" name="tradeName" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="pan">PAN *</Label>
          <Input id="pan" name="pan" placeholder="ABCDE1234F" />
          <FieldError errors={fe} name="pan" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="gstin">GSTIN(s) — one per line</Label>
          <Textarea id="gstin" name="gstin" rows={2} />
          <FieldError errors={fe} name="gstin" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="placeOfSupply">Place of supply</Label>
          <Input id="placeOfSupply" name="placeOfSupply" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="placeOfInvoice">Place of invoice</Label>
          <Input id="placeOfInvoice" name="placeOfInvoice" />
        </div>
        <label className="flex items-center gap-2">
          <Checkbox name="msmeStatus" />
          <span className="text-sm">MSME registered</span>
        </label>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <h2 className="col-span-full text-sm font-semibold text-muted-foreground">
          Address
        </h2>
        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="addressLine">Address</Label>
          <Input id="addressLine" name="addressLine" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="state">State</Label>
          <Input id="state" name="state" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="pincode">Pincode</Label>
          <Input id="pincode" name="pincode" />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <h2 className="col-span-full text-sm font-semibold text-muted-foreground">
          Bank details
        </h2>
        <div className="flex flex-col gap-2">
          <Label htmlFor="bankAccountNo">Account number *</Label>
          <Input id="bankAccountNo" name="bankAccountNo" />
          <FieldError errors={fe} name="bankAccountNo" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="bankName">Bank name *</Label>
          <Input id="bankName" name="bankName" />
          <FieldError errors={fe} name="bankName" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ifsc">IFSC *</Label>
          <Input id="ifsc" name="ifsc" placeholder="ABCD0123456" />
          <FieldError errors={fe} name="ifsc" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="beneficiaryName">Beneficiary name *</Label>
          <Input id="beneficiaryName" name="beneficiaryName" />
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
            defaultValue={VENDOR_CATEGORIES[0]}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {VENDOR_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="paymentTerms">Payment terms</Label>
          <Input id="paymentTerms" name="paymentTerms" placeholder="e.g. Net 30" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="tdsSection">TDS section</Label>
          <Input id="tdsSection" name="tdsSection" placeholder="e.g. 194C" />
        </div>
        <label className="flex items-center gap-2">
          <Checkbox name="lowerTdsFlag" />
          <span className="text-sm">Lower / NIL TDS certificate available</span>
        </label>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-muted-foreground">Documents</h2>
        {VRF_DOC_SLOTS.map((slot) => (
          <div key={slot.key} className="flex flex-col gap-2">
            <Label htmlFor={`doc_${slot.key}`}>
              {slot.label}
              {slot.required ? " *" : ""}
            </Label>
            <Input
              id={`doc_${slot.key}`}
              name={`doc_${slot.key}`}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
            />
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <label className="flex items-start gap-2">
          <Checkbox name="declaration" className="mt-1" />
          <span className="text-sm">
            I declare that the information and documents provided are true and
            correct to the best of my knowledge.
          </span>
        </label>
        <FieldError errors={fe} name="declaration" />
      </section>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Submit registration"}
        </Button>
      </div>
    </form>
  );
}
