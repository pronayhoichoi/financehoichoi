"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";

export type LocationState = { error?: string } | undefined;

export async function createLocationAction(
  projectId: string,
  _prev: LocationState,
  formData: FormData,
): Promise<LocationState> {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "LOCATIONS")) {
    return { error: "Not permitted." };
  }
  const name = ((formData.get("name") as string) || "").trim();
  if (!name) return { error: "Location name is required." };

  const dayCostRaw = (formData.get("dayCost") as string) || "";
  const loc = await prisma.location.create({
    data: {
      projectId,
      name,
      address: ((formData.get("address") as string) || "").trim() || null,
      contactName: ((formData.get("contactName") as string) || "").trim() || null,
      contactPhone: ((formData.get("contactPhone") as string) || "").trim() || null,
      dayCost: dayCostRaw ? Number(dayCostRaw) : null,
      permitNote: ((formData.get("permitNote") as string) || "").trim() || null,
      notes: ((formData.get("notes") as string) || "").trim() || null,
    },
  });
  await recordAudit({
    entityType: "Location",
    entityId: loc.id,
    action: "CREATE",
    userId: session.user.id,
    after: { name },
  });
  revalidatePath(`/projects/${projectId}/locations`);
  return {};
}

export async function deleteLocationAction(locationId: string) {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "LOCATIONS")) redirect("/forbidden");
  const loc = await prisma.location.findUnique({
    where: { id: locationId },
    select: { projectId: true },
  });
  if (!loc) return;
  await prisma.location.delete({ where: { id: locationId } });
  revalidatePath(`/projects/${loc.projectId}/locations`);
}
