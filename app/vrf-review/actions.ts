"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canApprove, canEdit } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { nextVendorCode } from "@/lib/vendor-code";
import { findDuplicateVendors, vendorDataFromForm } from "@/lib/vendor";
import { vendorFormSchema } from "@/lib/validation/vendor";
import type { DocumentType } from "@/app/generated/prisma/client";

export type VrfInviteState = { error?: string; link?: string } | undefined;

async function baseUrl() {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3001";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return process.env.NEXTAUTH_URL ?? `${proto}://${host}`;
}

export async function inviteVendorAction(
  _prev: VrfInviteState,
  formData: FormData,
): Promise<VrfInviteState> {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "VRF")) {
    return { error: "You do not have permission to invite vendors." };
  }

  const email = ((formData.get("email") as string) || "").trim();
  if (!email) return { error: "Enter the vendor's email." };

  const token = nanoid(24);
  const submission = await prisma.vrfSubmission.create({
    data: { token, invitedEmail: email, formData: {}, status: "PENDING" },
  });

  const link = `${await baseUrl()}/vrf/${token}`;

  await sendEmail({
    to: email,
    subject: "hoichoi — Vendor Registration Form",
    body: `Please complete your vendor registration: ${link}`,
  });

  await recordAudit({
    entityType: "VrfSubmission",
    entityId: submission.id,
    action: "INVITE",
    userId: session.user.id,
    after: { invitedEmail: email },
  });

  revalidatePath("/vrf-review");
  return { link };
}

export async function requestEditsAction(
  submissionId: string,
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string } | undefined> {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "VRF")) {
    return { error: "Not permitted." };
  }
  const notes = ((formData.get("notes") as string) || "").trim();

  await prisma.vrfSubmission.update({
    where: { id: submissionId },
    data: {
      status: "EDITS_REQUESTED",
      reviewerNotes: notes || null,
      reviewedByUserId: session.user.id,
      reviewedAt: new Date(),
    },
  });

  await recordAudit({
    entityType: "VrfSubmission",
    entityId: submissionId,
    action: "REQUEST_EDITS",
    userId: session.user.id,
    after: { notes },
  });

  revalidatePath(`/vrf-review/${submissionId}`);
  revalidatePath("/vrf-review");
  return {};
}

export async function rejectVrfAction(
  submissionId: string,
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string } | undefined> {
  const session = await auth();
  if (!session?.user || !canApprove(session.user.role, "VRF")) {
    return { error: "Only Finance Head can reject." };
  }
  const notes = ((formData.get("notes") as string) || "").trim();

  await prisma.vrfSubmission.update({
    where: { id: submissionId },
    data: {
      status: "REJECTED",
      reviewerNotes: notes || null,
      reviewedByUserId: session.user.id,
      reviewedAt: new Date(),
    },
  });

  await recordAudit({
    entityType: "VrfSubmission",
    entityId: submissionId,
    action: "REJECT",
    userId: session.user.id,
    after: { notes },
  });

  revalidatePath(`/vrf-review/${submissionId}`);
  revalidatePath("/vrf-review");
  return {};
}

export async function approveVrfAction(
  submissionId: string,
): Promise<{ error?: string; vendorId?: string }> {
  const session = await auth();
  if (!session?.user || !canApprove(session.user.role, "VRF")) {
    return { error: "Only Finance Head can approve." };
  }

  const submission = await prisma.vrfSubmission.findUnique({
    where: { id: submissionId },
    include: { documents: true },
  });
  if (!submission) return { error: "Submission not found." };
  if (submission.status === "APPROVED") {
    return { error: "Already approved.", vendorId: submission.vendorId ?? undefined };
  }
  if (!submission.submittedAt) {
    return { error: "Vendor has not submitted the form yet." };
  }

  const parsed = vendorFormSchema.safeParse(submission.formData);
  if (!parsed.success) {
    return { error: "Submission data is incomplete; request edits instead." };
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

    // Carry the vendor-uploaded documents over to the Vendor record.
    if (submission.documents.length > 0) {
      await tx.vendorDocument.createMany({
        data: submission.documents.map((d) => ({
          vendorId: vendor.id,
          type: d.type as DocumentType,
          fileUrl: d.fileUrl,
          fileName: d.fileName,
        })),
      });
    }

    await tx.vrfSubmission.update({
      where: { id: submissionId },
      data: {
        status: "APPROVED",
        vendorId: vendor.id,
        reviewedByUserId: session.user.id,
        reviewedAt: new Date(),
      },
    });
  });

  await recordAudit({
    entityType: "VrfSubmission",
    entityId: submissionId,
    action: "APPROVE",
    userId: session.user.id,
    after: { vendorId },
  });
  await recordAudit({
    entityType: "Vendor",
    entityId: vendorId,
    action: "CREATE_FROM_VRF",
    userId: session.user.id,
    after: { vrfSubmissionId: submissionId },
  });

  if (submission.invitedEmail) {
    await sendEmail({
      to: submission.invitedEmail,
      subject: "hoichoi — Vendor registration approved",
      body: `Your vendor registration has been approved. Vendor code: (see finance).`,
    });
  }

  revalidatePath("/vrf-review");
  revalidatePath("/vendors");
  return { vendorId };
}
