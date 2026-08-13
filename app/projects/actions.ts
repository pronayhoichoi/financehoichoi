"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { nextProjectCode } from "@/lib/project-code";
import { projectFormSchema } from "@/lib/validation/project";

export type ProjectActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function parseForm(formData: FormData) {
  return projectFormSchema.safeParse({
    title: formData.get("title"),
    type: formData.get("type"),
    genre: formData.get("genre"),
    status: formData.get("status"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    businessUnit: formData.get("businessUnit"),
    producer: formData.get("producer"),
    currency: formData.get("currency") || "INR",
    commissioned: formData.get("commissioned") === "on",
  });
}

function toData(v: ReturnType<typeof projectFormSchema.parse>) {
  return {
    title: v.title,
    type: v.type,
    genre: v.genre || null,
    status: v.status,
    startDate: v.startDate ? new Date(v.startDate) : null,
    endDate: v.endDate ? new Date(v.endDate) : null,
    businessUnit: v.businessUnit || null,
    producer: v.producer || null,
    currency: v.currency,
    commissioned: v.commissioned,
  };
}

export async function createProjectAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "PROJECT")) {
    return { error: "You do not have permission to create projects." };
  }

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  let projectId = "";
  await prisma.$transaction(async (tx) => {
    const code = await nextProjectCode(tx);
    const project = await tx.project.create({
      data: { code, ...toData(parsed.data) },
    });
    projectId = project.id;
  });

  await recordAudit({
    entityType: "Project",
    entityId: projectId,
    action: "CREATE",
    userId: session.user.id,
    after: toData(parsed.data),
  });

  revalidatePath("/projects");
  redirect(`/projects/${projectId}`);
}

export async function updateProjectAction(
  projectId: string,
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "PROJECT")) {
    return { error: "You do not have permission to edit projects." };
  }

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const before = await prisma.project.findUnique({ where: { id: projectId } });
  if (!before) return { error: "Project not found." };

  await prisma.project.update({
    where: { id: projectId },
    data: toData(parsed.data),
  });

  await recordAudit({
    entityType: "Project",
    entityId: projectId,
    action: "UPDATE",
    userId: session.user.id,
    before: { ...before, createdAt: undefined, updatedAt: undefined },
    after: toData(parsed.data),
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  return {};
}
