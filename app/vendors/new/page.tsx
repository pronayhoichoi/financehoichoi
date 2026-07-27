import Link from "next/link";
import { requireEdit } from "@/lib/require-access";
import { createVendorAction } from "../actions";
import { VendorForm } from "../vendor-form";

export default async function NewVendorPage() {
  await requireEdit("VENDOR_MASTER");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/vendors" className="text-sm text-muted-foreground hover:underline">
        ← Vendors
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">New vendor</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        A vendor code (V-{new Date().getFullYear()}-####) is assigned on save.
      </p>
      <VendorForm action={createVendorAction} submitLabel="Create vendor" />
    </div>
  );
}
