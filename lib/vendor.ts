import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";
import type { VendorFormValues } from "@/lib/validation/vendor";

export type DuplicateMatch = {
  field: "PAN" | "GSTIN" | "BANK_ACCOUNT";
  vendorCode: string;
  legalName: string;
};

/**
 * Detect duplicate PAN / GSTIN / bank account, per Sheet 2's "Duplicate
 * vendor Check". `excludeVendorId` skips the record being edited.
 */
export async function findDuplicateVendors(
  values: Pick<VendorFormValues, "pan" | "gstin" | "bankAccountNo">,
  excludeVendorId?: string,
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<DuplicateMatch[]> {
  const notSelf = excludeVendorId ? { id: { not: excludeVendorId } } : {};

  const matches: DuplicateMatch[] = [];

  const byPan = await client.vendor.findFirst({
    where: { pan: values.pan, ...notSelf },
    select: { vendorCode: true, legalName: true },
  });
  if (byPan) {
    matches.push({ field: "PAN", ...byPan });
  }

  if (values.gstin.length > 0) {
    const byGstin = await client.vendor.findFirst({
      where: { gstin: { hasSome: values.gstin }, ...notSelf },
      select: { vendorCode: true, legalName: true },
    });
    if (byGstin) {
      matches.push({ field: "GSTIN", ...byGstin });
    }
  }

  const byBank = await client.vendor.findFirst({
    where: { bankAccountNo: values.bankAccountNo, ...notSelf },
    select: { vendorCode: true, legalName: true },
  });
  if (byBank) {
    matches.push({ field: "BANK_ACCOUNT", ...byBank });
  }

  return matches;
}

/** Map validated form values to Prisma vendor create/update data. */
export function vendorDataFromForm(values: VendorFormValues) {
  return {
    legalName: values.legalName,
    tradeName: values.tradeName || null,
    pan: values.pan,
    gstin: values.gstin,
    placeOfSupply: values.placeOfSupply || null,
    placeOfInvoice: values.placeOfInvoice || null,
    msmeStatus: values.msmeStatus,
    addressLine: values.addressLine || null,
    city: values.city || null,
    state: values.state || null,
    pincode: values.pincode || null,
    bankAccountNo: values.bankAccountNo,
    bankName: values.bankName,
    ifsc: values.ifsc,
    beneficiaryName: values.beneficiaryName,
    category: values.category,
    paymentTerms: values.paymentTerms || null,
    tdsSection: values.tdsSection || null,
    lowerTdsFlag: values.lowerTdsFlag,
    defaultLedger: values.defaultLedger || null,
  };
}
