import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";

export async function recordAudit(entry: {
  entityType: string;
  entityId: string;
  action: string;
  userId?: string | null;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({
    data: {
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      userId: entry.userId ?? null,
      beforeJson: entry.before,
      afterJson: entry.after,
    },
  });
}
