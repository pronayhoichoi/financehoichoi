import { prisma } from "@/lib/prisma";
import { COMMITTING_PO_STATUSES } from "@/lib/budget";

/**
 * Budget-gating check: how much is still available on a budget line, excluding
 * a given PO (so editing/approving an existing PO doesn't double-count itself).
 */
export async function availableOnBudgetLine(
  budgetLineId: string,
  excludePurchaseOrderId?: string,
): Promise<number> {
  const line = await prisma.budgetLine.findUnique({
    where: { id: budgetLineId },
    select: { approvedAmount: true },
  });
  if (!line) return 0;

  const committed = await prisma.poLine.findMany({
    where: {
      budgetLineId,
      purchaseOrder: {
        status: { in: COMMITTING_PO_STATUSES },
        ...(excludePurchaseOrderId ? { id: { not: excludePurchaseOrderId } } : {}),
      },
    },
    select: { amount: true },
  });

  const used = committed.reduce((sum, p) => sum + Number(p.amount), 0);
  return Number(line.approvedAmount) - used;
}

/** Sum of a PO's line amounts grouped by budget line. */
export function sumPoLinesByBudgetLine(
  lines: { budgetLineId: string | null; amount: number }[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const l of lines) {
    if (!l.budgetLineId) continue;
    map.set(l.budgetLineId, (map.get(l.budgetLineId) ?? 0) + l.amount);
  }
  return map;
}
