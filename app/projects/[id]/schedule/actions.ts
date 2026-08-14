"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";

export type ScheduleState = { error?: string } | undefined;

export async function createShootDayAction(
  projectId: string,
  _prev: ScheduleState,
  formData: FormData,
): Promise<ScheduleState> {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "SCHEDULE")) {
    return { error: "Not permitted." };
  }

  const last = await prisma.shootDay.findFirst({
    where: { projectId },
    orderBy: { dayNumber: "desc" },
    select: { dayNumber: true },
  });
  const dateRaw = (formData.get("date") as string) || "";
  const locationId = ((formData.get("locationId") as string) || "").trim();

  try {
    const day = await prisma.shootDay.create({
      data: {
        projectId,
        dayNumber: (last?.dayNumber ?? 0) + 1,
        date: dateRaw ? new Date(dateRaw) : null,
        unit: ((formData.get("unit") as string) || "").trim() || null,
        locationId: locationId || null,
        generalCallTime: ((formData.get("generalCallTime") as string) || "").trim() || null,
        notes: ((formData.get("notes") as string) || "").trim() || null,
      },
    });
    await recordAudit({
      entityType: "ShootDay",
      entityId: day.id,
      action: "CREATE",
      userId: session.user.id,
      after: { dayNumber: day.dayNumber },
    });
  } catch {
    return { error: "Could not create shoot day." };
  }
  revalidatePath(`/projects/${projectId}/schedule`);
  return {};
}

export async function deleteShootDayAction(shootDayId: string) {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "SCHEDULE")) redirect("/forbidden");
  const day = await prisma.shootDay.findUnique({
    where: { id: shootDayId },
    select: { projectId: true },
  });
  if (!day) return;
  // Unassign scenes first (they reference this day), then delete.
  await prisma.$transaction([
    prisma.scene.updateMany({
      where: { shootDayId },
      data: { shootDayId: null, dayOrder: null },
    }),
    prisma.shootDay.delete({ where: { id: shootDayId } }),
  ]);
  revalidatePath(`/projects/${day.projectId}/schedule`);
}

export async function assignSceneAction(
  sceneId: string,
  shootDayId: string,
) {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "SCHEDULE")) redirect("/forbidden");
  const scene = await prisma.scene.findUnique({
    where: { id: sceneId },
    select: { projectId: true },
  });
  if (!scene) return;

  const last = await prisma.scene.findFirst({
    where: { shootDayId },
    orderBy: { dayOrder: "desc" },
    select: { dayOrder: true },
  });
  await prisma.scene.update({
    where: { id: sceneId },
    data: { shootDayId, dayOrder: (last?.dayOrder ?? -1) + 1 },
  });
  revalidatePath(`/projects/${scene.projectId}/schedule`);
}

export async function unassignSceneAction(sceneId: string) {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "SCHEDULE")) redirect("/forbidden");
  const scene = await prisma.scene.findUnique({
    where: { id: sceneId },
    select: { projectId: true },
  });
  if (!scene) return;
  await prisma.scene.update({
    where: { id: sceneId },
    data: { shootDayId: null, dayOrder: null },
  });
  revalidatePath(`/projects/${scene.projectId}/schedule`);
}

export async function addCrewCallAction(
  shootDayId: string,
  _prev: ScheduleState,
  formData: FormData,
): Promise<ScheduleState> {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "SCHEDULE")) {
    return { error: "Not permitted." };
  }
  const contactId = ((formData.get("contactId") as string) || "").trim();
  if (!contactId) return { error: "Pick a crew member." };
  const day = await prisma.shootDay.findUnique({
    where: { id: shootDayId },
    select: { projectId: true },
  });
  if (!day) return { error: "Shoot day not found." };

  await prisma.shootDayCrew.upsert({
    where: { shootDayId_contactId: { shootDayId, contactId } },
    update: { callTime: ((formData.get("callTime") as string) || "").trim() || null },
    create: {
      shootDayId,
      contactId,
      callTime: ((formData.get("callTime") as string) || "").trim() || null,
    },
  });
  revalidatePath(`/projects/${day.projectId}/schedule`);
  return {};
}

export async function removeCrewCallAction(entryId: string) {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "SCHEDULE")) redirect("/forbidden");
  const entry = await prisma.shootDayCrew.findUnique({
    where: { id: entryId },
    select: { shootDay: { select: { projectId: true } } },
  });
  if (!entry) return;
  await prisma.shootDayCrew.delete({ where: { id: entryId } });
  revalidatePath(`/projects/${entry.shootDay.projectId}/schedule`);
}
