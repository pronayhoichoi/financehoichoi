"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canApprove, canEdit } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { nextPoNumber } from "@/lib/po-number";
import { availableOnBudgetLine, sumPoLinesByBudgetLine } from "@/lib/po";
import { poFormSchema, lineAmount } from "@/lib/validation/po";

export type PoActionState = { error?: string } | undefined;

export async function createPoAction(
  _prev: PoActionState,
  formData: FormData,
): Promise<PoActionState> {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "PO")) {
    return { error: "You do not have permission to create purchase orders." };
  }

  let linesRaw: unknown;
  try {
    linesRaw = JSON.parse((formData.get("lines") as string) || "[]");
  } catch {
    return { error: "Could not read the PO lines." };
  }

  const parsed = poFormSchema.safeParse({
    projectId: formData.get("projectId"),
    vendorId: formData.get("vendorId"),
    deliveryDate: formData.get("deliveryDate"),
    notes: formData.get("notes"),
    lines: linesRaw,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please fix the form." };
  }

  let poId = "";
  await prisma.$transaction(async (tx) => {
    const poNumber = await nextPoNumber(tx);
    const po = await tx.purchaseOrder.create({
      data: {
        poNumber,
        projectId: parsed.data.projectId,
        vendorId: parsed.data.vendorId,
        status: "DRAFT",
        deliveryDate: parsed.data.deliveryDate ? new Date(parsed.data.deliveryDate) : null,
        notes: parsed.data.notes || null,
        createdByUserId: session.user.id,
        lines: {
          create: parsed.data.lines.map((l) => ({
            budgetLineId: l.budgetLineId || null,
            description: l.description,
            qty: l.qty,
            rate: l.rate,
            taxPct: l.taxPct ?? null,
            amount: lineAmount(l.qty, l.rate),
          })),
        },
      },
    });
    poId = po.id;
  });

  await recordAudit({
    entityType: "PurchaseOrder",
    entityId: poId,
    action: "CREATE",
    userId: session.user.id,
    after: { projectId: parsed.data.projectId, vendorId: parsed.data.vendorId },
  });

  revalidatePath("/purchase-orders");
  redirect(`/purchase-orders/${poId}`);
}

export async function submitPoAction(poId: string) {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "PO")) redirect("/forbidden");
  const po = await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { status: true } });
  if (!po || po.status !== "DRAFT") return;
  await prisma.purchaseOrder.update({ where: { id: poId }, data: { status: "PENDING_APPROVAL" } });
  await recordAudit({ entityType: "PurchaseOrder", entityId: poId, action: "SUBMIT", userId: session.user.id });
  revalidatePath(`/purchase-orders/${poId}`);
}

/**
 * Approve a PO. Enforces budget gating: the PO's committed amounts must not
 * push any linked budget line negative, unless `override` is set (Finance Head
 * knowingly approves over budget).
 */
export async function approvePoAction(poId: string, override: boolean) {
  const session = await auth();
  if (!session?.user || !canApprove(session.user.role, "PO")) redirect("/forbidden");

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: { lines: true },
  });
  if (!po || po.status !== "PENDING_APPROVAL") return { error: "Not pending approval." };

  if (!override) {
    const byLine = sumPoLinesByBudgetLine(
      po.lines.map((l) => ({ budgetLineId: l.budgetLineId, amount: Number(l.amount) })),
    );
    for (const [budgetLineId, amount] of byLine) {
      const available = await availableOnBudgetLine(budgetLineId, poId);
      if (amount > available + 1e-6) {
        return {
          error: `Over budget: this PO commits ₹${amount.toLocaleString("en-IN")} to a budget line with only ₹${available.toLocaleString("en-IN")} available. A Finance Head can override.`,
        };
      }
    }
  }

  await prisma.purchaseOrder.update({
    where: { id: poId },
    data: {
      status: "APPROVED",
      approvedByUserId: session.user.id,
      approvedAt: new Date(),
      budgetOverride: override,
    },
  });
  await recordAudit({
    entityType: "PurchaseOrder",
    entityId: poId,
    action: override ? "APPROVE_OVERRIDE" : "APPROVE",
    userId: session.user.id,
  });
  revalidatePath(`/purchase-orders/${poId}`);
  revalidatePath("/purchase-orders");
  return {};
}

export async function cancelPoAction(poId: string) {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "PO")) redirect("/forbidden");
  const po = await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { status: true } });
  if (!po || po.status === "CLOSED" || po.status === "CANCELLED") return;
  await prisma.purchaseOrder.update({ where: { id: poId }, data: { status: "CANCELLED" } });
  await recordAudit({ entityType: "PurchaseOrder", entityId: poId, action: "CANCEL", userId: session.user.id });
  revalidatePath(`/purchase-orders/${poId}`);
  revalidatePath("/purchase-orders");
}
