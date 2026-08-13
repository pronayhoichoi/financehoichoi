"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canApprove, canEdit } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { budgetLinesSchema } from "@/lib/validation/budget";

export type BudgetActionState = { error?: string } | undefined;

/** Create the first DRAFT budget (version 1) for a project, or resume editing. */
export async function createBudgetAction(projectId: string) {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "PRODUCTION_BUDGET")) {
    redirect("/forbidden");
  }

  const existingEditable = await prisma.budgetHeader.findFirst({
    where: { projectId, status: { in: ["DRAFT", "REVISION"] } },
    orderBy: { version: "desc" },
  });
  if (existingEditable) {
    redirect(`/projects/${projectId}/budget`);
  }

  const latest = await prisma.budgetHeader.findFirst({
    where: { projectId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const header = await prisma.budgetHeader.create({
    data: { projectId, version: (latest?.version ?? 0) + 1, status: "DRAFT" },
  });

  await recordAudit({
    entityType: "BudgetHeader",
    entityId: header.id,
    action: "CREATE",
    userId: session.user.id,
    after: { projectId, version: header.version },
  });

  revalidatePath(`/projects/${projectId}/budget`);
  redirect(`/projects/${projectId}/budget`);
}

/** Replace all lines on an editable (DRAFT/REVISION) budget header. */
export async function saveBudgetLinesAction(
  headerId: string,
  _prev: BudgetActionState,
  formData: FormData,
): Promise<BudgetActionState> {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "PRODUCTION_BUDGET")) {
    return { error: "Not permitted." };
  }

  const header = await prisma.budgetHeader.findUnique({
    where: { id: headerId },
    include: { project: { select: { currency: true, id: true } } },
  });
  if (!header) return { error: "Budget not found." };
  if (header.status !== "DRAFT" && header.status !== "REVISION") {
    return { error: "This budget is locked and cannot be edited." };
  }

  let raw: unknown;
  try {
    raw = JSON.parse((formData.get("lines") as string) || "[]");
  } catch {
    return { error: "Could not read the budget lines." };
  }
  const parsed = budgetLinesSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid budget lines." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.budgetLine.deleteMany({ where: { budgetHeaderId: headerId } });
    await tx.budgetLine.createMany({
      data: parsed.data.map((l, i) => ({
        budgetHeaderId: headerId,
        department: l.department,
        category: l.category,
        ledger: l.ledger || null,
        description: l.description,
        approvedAmount: l.approvedAmount,
        currency: header.project.currency,
        sortOrder: i,
      })),
    });
  });

  await recordAudit({
    entityType: "BudgetHeader",
    entityId: headerId,
    action: "SAVE_LINES",
    userId: session.user.id,
    after: { lineCount: parsed.data.length },
  });

  revalidatePath(`/projects/${header.project.id}/budget`);
  return {};
}

export async function submitBudgetAction(headerId: string) {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "PRODUCTION_BUDGET")) {
    redirect("/forbidden");
  }
  const header = await prisma.budgetHeader.findUnique({
    where: { id: headerId },
    include: { _count: { select: { lines: true } }, project: { select: { id: true } } },
  });
  if (!header) redirect("/projects");
  if (header.status !== "DRAFT" && header.status !== "REVISION") return;
  if (header._count.lines === 0) return;

  await prisma.budgetHeader.update({
    where: { id: headerId },
    data: { status: "PENDING_APPROVAL" },
  });
  await recordAudit({
    entityType: "BudgetHeader",
    entityId: headerId,
    action: "SUBMIT",
    userId: session.user.id,
  });
  revalidatePath(`/projects/${header.project.id}/budget`);
}

export async function approveBudgetAction(headerId: string) {
  const session = await auth();
  if (!session?.user || !canApprove(session.user.role, "PRODUCTION_BUDGET")) {
    redirect("/forbidden");
  }
  const header = await prisma.budgetHeader.findUnique({
    where: { id: headerId },
    select: { id: true, status: true, projectId: true },
  });
  if (!header || header.status !== "PENDING_APPROVAL") return;

  await prisma.$transaction(async (tx) => {
    // Enforce "at most one APPROVED per project": demote any prior approved.
    await tx.budgetHeader.updateMany({
      where: { projectId: header.projectId, status: "APPROVED" },
      data: { status: "REVISION" },
    });
    await tx.budgetHeader.update({
      where: { id: headerId },
      data: {
        status: "APPROVED",
        approvedByUserId: session.user.id,
        approvedAt: new Date(),
      },
    });
  });

  await recordAudit({
    entityType: "BudgetHeader",
    entityId: headerId,
    action: "APPROVE",
    userId: session.user.id,
  });
  revalidatePath(`/projects/${header.projectId}/budget`);
  revalidatePath(`/projects/${header.projectId}`);
}

/** Clone the active APPROVED budget into a new editable DRAFT version. */
export async function createRevisionAction(projectId: string) {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "PRODUCTION_BUDGET")) {
    redirect("/forbidden");
  }
  const active = await prisma.budgetHeader.findFirst({
    where: { projectId, status: "APPROVED" },
    orderBy: { version: "desc" },
    include: { lines: true },
  });
  const latest = await prisma.budgetHeader.findFirst({
    where: { projectId },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  await prisma.$transaction(async (tx) => {
    const header = await tx.budgetHeader.create({
      data: {
        projectId,
        version: (latest?.version ?? 0) + 1,
        status: "DRAFT",
      },
    });
    if (active) {
      await tx.budgetLine.createMany({
        data: active.lines.map((l) => ({
          budgetHeaderId: header.id,
          department: l.department,
          category: l.category,
          ledger: l.ledger,
          description: l.description,
          approvedAmount: l.approvedAmount,
          currency: l.currency,
          sortOrder: l.sortOrder,
        })),
      });
    }
  });

  revalidatePath(`/projects/${projectId}/budget`);
  redirect(`/projects/${projectId}/budget`);
}
