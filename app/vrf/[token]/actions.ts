"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { saveUploadedFile } from "@/lib/storage";
import { vrfSubmitSchema, VRF_DOC_SLOTS } from "@/lib/validation/vrf";
import { verifyPan, verifyGstin } from "@/lib/gov-verification";
import type { DocumentType } from "@/app/generated/prisma/client";

export type VrfSubmitState =
  | { error?: string; fieldErrors?: Record<string, string[]>; success?: boolean }
  | undefined;

export async function submitVrfAction(
  token: string,
  _prev: VrfSubmitState,
  formData: FormData,
): Promise<VrfSubmitState> {
  const submission = await prisma.vrfSubmission.findUnique({ where: { token } });
  if (!submission) return { error: "This registration link is invalid." };
  if (submission.status === "APPROVED" || submission.status === "REJECTED") {
    return { error: "This registration has already been closed." };
  }

  const gstinRaw = (formData.get("gstin") as string) || "";
  const gstin = gstinRaw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const parsed = vrfSubmitSchema.safeParse({
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
    // defaultLedger is finance-internal and not collected on the public VRF.
    defaultLedger: "",
    declaration: formData.get("declaration") === "on",
  });

  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // Required document check.
  for (const slot of VRF_DOC_SLOTS) {
    if (!slot.required) continue;
    const file = formData.get(`doc_${slot.key}`) as File | null;
    if (!file || file.size === 0) {
      return { error: `${slot.label} is required.` };
    }
  }

  // Government verification is stubbed (returns "not verified") until the
  // PAN/GST portal APIs are wired in — see lib/gov-verification.ts.
  const { declaration, ...vendorFields } = parsed.data;
  void declaration;
  const panCheck = await verifyPan(vendorFields.pan);
  const gstChecks = await Promise.all(vendorFields.gstin.map(verifyGstin));

  await prisma.$transaction(async (tx) => {
    await tx.vrfSubmission.update({
      where: { id: submission.id },
      data: {
        formData: {
          ...vendorFields,
          _verification: {
            pan: panCheck,
            gstin: gstChecks,
          },
        },
        status: "PENDING",
        submittedAt: new Date(),
        reviewerNotes: null,
      },
    });

    // Replace any prior uploads from an earlier attempt.
    await tx.vrfDocument.deleteMany({ where: { vrfSubmissionId: submission.id } });

    for (const slot of VRF_DOC_SLOTS) {
      const file = formData.get(`doc_${slot.key}`) as File | null;
      if (!file || file.size === 0) continue;
      const { fileUrl, fileName } = await saveUploadedFile(
        file,
        `vrf/${submission.id}`,
      );
      await tx.vrfDocument.create({
        data: {
          vrfSubmissionId: submission.id,
          type: slot.key as DocumentType,
          fileUrl,
          fileName,
        },
      });
    }
  });

  await recordAudit({
    entityType: "VrfSubmission",
    entityId: submission.id,
    action: "SUBMIT",
    after: { legalName: vendorFields.legalName, pan: vendorFields.pan },
  });

  revalidatePath("/vrf-review");
  return { success: true };
}
