import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";

/**
 * V-{year}-{seq} per Sheet 3's Vendor Master spec (e.g. V-2026-0001).
 * Pass the active transaction client when calling this inside a
 * `prisma.$transaction` so the count and the insert are atomic.
 */
export async function nextVendorCode(
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `V-${year}-`;

  const count = await client.vendor.count({
    where: { vendorCode: { startsWith: prefix } },
  });

  const seq = (count + 1).toString().padStart(4, "0");
  return `${prefix}${seq}`;
}
