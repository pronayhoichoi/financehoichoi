import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";

/**
 * PRJ-{year}-{seq} (e.g. PRJ-2026-001). Call inside a transaction so the
 * count and insert stay atomic.
 */
export async function nextProjectCode(
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PRJ-${year}-`;
  const count = await client.project.count({
    where: { code: { startsWith: prefix } },
  });
  return `${prefix}${(count + 1).toString().padStart(3, "0")}`;
}
