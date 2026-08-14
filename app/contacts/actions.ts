"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";

export type ContactState = { error?: string } | undefined;

export async function createContactAction(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "CREW")) {
    return { error: "Not permitted." };
  }
  const name = ((formData.get("name") as string) || "").trim();
  if (!name) return { error: "Name is required." };

  const vendorId = ((formData.get("vendorId") as string) || "").trim();
  const contact = await prisma.contact.create({
    data: {
      name,
      role: ((formData.get("role") as string) || "").trim() || null,
      department: ((formData.get("department") as string) || "").trim() || null,
      email: ((formData.get("email") as string) || "").trim() || null,
      phone: ((formData.get("phone") as string) || "").trim() || null,
      vendorId: vendorId || null,
    },
  });
  await recordAudit({
    entityType: "Contact",
    entityId: contact.id,
    action: "CREATE",
    userId: session.user.id,
    after: { name },
  });
  revalidatePath("/contacts");
  return {};
}

export async function deleteContactAction(contactId: string) {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "CREW")) redirect("/forbidden");
  await prisma.contact.delete({ where: { id: contactId } });
  revalidatePath("/contacts");
}
