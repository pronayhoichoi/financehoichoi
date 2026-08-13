import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";

/**
 * PO-{year}-{seq} (e.g. PO-2026-0001). Call inside a transaction so the
 * count and insert stay atomic.
 */
export async function nextPoNumber(
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;
  const count = await client.purchaseOrder.count({
    where: { poNumber: { startsWith: prefix } },
  });
  return `${prefix}${(count + 1).toString().padStart(4, "0")}`;
}
