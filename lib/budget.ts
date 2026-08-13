import { prisma } from "@/lib/prisma";
import type { PoStatus } from "@/app/generated/prisma/client";

// PO amounts that count as "committed" against a budget line.
export const COMMITTING_PO_STATUSES: PoStatus[] = [
  "APPROVED",
  "PARTIALLY_FULFILLED",
];

export type LineActuals = {
  budgetLineId: string;
  approved: number;
  committed: number;
  available: number;
};

/**
 * Budget-vs-Actuals for every line in a budget header (computed, not stored).
 * Committed = Σ PoLine.amount for POs in a committing status. Invoiced/Paid
 * arrive with the Payments module — not included yet.
 */
export async function computeLineActuals(
  budgetHeaderId: string,
): Promise<Map<string, LineActuals>> {
  const lines = await prisma.budgetLine.findMany({
    where: { budgetHeaderId },
    include: {
      poLines: {
        where: { purchaseOrder: { status: { in: COMMITTING_PO_STATUSES } } },
        select: { amount: true },
      },
    },
  });

  const map = new Map<string, LineActuals>();
  for (const line of lines) {
    const approved = Number(line.approvedAmount);
    const committed = line.poLines.reduce((sum, p) => sum + Number(p.amount), 0);
    map.set(line.id, {
      budgetLineId: line.id,
      approved,
      committed,
      available: approved - committed,
    });
  }
  return map;
}

/** The single active (APPROVED) budget for a project, if any. */
export async function getActiveBudget(projectId: string) {
  return prisma.budgetHeader.findFirst({
    where: { projectId, status: "APPROVED" },
    orderBy: { version: "desc" },
  });
}
