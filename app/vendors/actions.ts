"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { nextVendorCode } from "@/lib/vendor-code";
import { findDuplicateVendors, vendorDataFromForm } from "@/lib/vendor";
import { vendorFormSchema } from "@/lib/validation/vendor";
import { saveUploadedFile } from "@/lib/storage";
import type { DocumentType, VendorStatus } from "@/app/generated/prisma/client";

const VALID_DOC_TYPES: DocumentType[] = [
  "PAN",
  "GST",
  "MSME",
  "CANCELLED_CHEQUE",
  "AGREEMENT",
  "OTHER",
];

export type VendorActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function parseForm(formData: FormData) {
  const gstinRaw = (formData.get("gstin") as string) || "";
  const gstin = gstinRaw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);

  return vendorFormSchema.safeParse({
    legalName: formData.get("legalName"),
    tradeName: formData.get("tradeName"),
    pan: formData.get("pan"),
    gstin,
    placeOfSupply: formData.get("placeOfSupply"),
    placeOfInvoice: formData.get("placeOfInvoice"),
    msmeStatus: formData.get("msmeStatus") === "on",
    addressLine: formData.get("addressLine"),
    city: formData.get("city"),
    state: formData.get("state"),
    pincode: formData.get("pincode"),
    bankAccountNo: formData.get("bankAccountNo"),
    bankName: formData.get("bankName"),
    ifsc: formData.get("ifsc"),
    beneficiaryName: formData.get("beneficiaryName"),
    category: formData.get("category"),
    paymentTerms: formData.get("paymentTerms"),
    tdsSection: formData.get("tdsSection"),
    lowerTdsFlag: formData.get("lowerTdsFlag") === "on",
    defaultLedger: formData.get("defaultLedger"),
  });
}

export async function createVendorAction(
  _prev: VendorActionState,
  formData: FormData,
): Promise<VendorActionState> {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "VENDOR_MASTER")) {
    return { error: "You do not have permission to create vendors." };
  }

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const dupes = await findDuplicateVendors({
    pan: parsed.data.pan,
    gstin: parsed.data.gstin,
    bankAccountNo: parsed.data.bankAccountNo,
  });
  if (dupes.length > 0) {
    const d = dupes[0];
    return {
      error: `Duplicate ${d.field} — already used by ${d.vendorCode} (${d.legalName}).`,
    };
  }

  let vendorId = "";
  await prisma.$transaction(async (tx) => {
    const vendorCode = await nextVendorCode(tx);
    const vendor = await tx.vendor.create({
      data: { vendorCode, ...vendorDataFromForm(parsed.data) },
    });
    vendorId = vendor.id;
  });

  await recordAudit({
    entityType: "Vendor",
    entityId: vendorId,
    action: "CREATE",
    userId: session.user.id,
    after: vendorDataFromForm(parsed.data),
  });

  revalidatePath("/vendors");
  redirect(`/vendors/${vendorId}`);
}

export async function updateVendorAction(
  vendorId: string,
  _prev: VendorActionState,
  formData: FormData,
): Promise<VendorActionState> {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "VENDOR_MASTER")) {
    return { error: "You do not have permission to edit vendors." };
  }

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const before = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!before) return { error: "Vendor not found." };

  const dupes = await findDuplicateVendors(
    {
      pan: parsed.data.pan,
      gstin: parsed.data.gstin,
      bankAccountNo: parsed.data.bankAccountNo,
    },
    vendorId,
  );
  if (dupes.length > 0) {
    const d = dupes[0];
    return {
      error: `Duplicate ${d.field} — already used by ${d.vendorCode} (${d.legalName}).`,
    };
  }

  await prisma.vendor.update({
    where: { id: vendorId },
    data: vendorDataFromForm(parsed.data),
  });

  await recordAudit({
    entityType: "Vendor",
    entityId: vendorId,
    action: "UPDATE",
    userId: session.user.id,
    before: { ...before, createdAt: undefined, updatedAt: undefined },
    after: vendorDataFromForm(parsed.data),
  });

  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/vendors");
  return {};
}

export async function setVendorStatusAction(
  vendorId: string,
  status: VendorStatus,
) {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "VENDOR_MASTER")) {
    return;
  }

  const before = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { status: true },
  });

  await prisma.vendor.update({ where: { id: vendorId }, data: { status } });

  await recordAudit({
    entityType: "Vendor",
    entityId: vendorId,
    action: "STATUS_CHANGE",
    userId: session.user.id,
    before: { status: before?.status },
    after: { status },
  });

  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/vendors");
}

export async function uploadVendorDocumentAction(
  vendorId: string,
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string } | undefined> {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "VENDOR_MASTER")) {
    return { error: "You do not have permission to upload documents." };
  }

  const type = formData.get("type") as DocumentType;
  const file = formData.get("file") as File | null;
  const expiryRaw = (formData.get("expiryDate") as string) || "";

  if (!VALID_DOC_TYPES.includes(type)) return { error: "Invalid document type." };
  if (!file || file.size === 0) return { error: "Please choose a file." };

  const { fileUrl, fileName } = await saveUploadedFile(file, `vendors/${vendorId}`);

  await prisma.vendorDocument.create({
    data: {
      vendorId,
      type,
      fileUrl,
      fileName,
      expiryDate: expiryRaw ? new Date(expiryRaw) : null,
    },
  });

  await recordAudit({
    entityType: "Vendor",
    entityId: vendorId,
    action: "DOCUMENT_UPLOAD",
    userId: session.user.id,
    after: { type, fileName },
  });

  revalidatePath(`/vendors/${vendorId}`);
  return {};
}
