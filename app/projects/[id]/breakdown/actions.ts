"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { saveUploadedFile } from "@/lib/storage";
import { ELEMENT_LABEL } from "@/lib/breakdown";
import {
  elementsSchema,
  sceneFormSchema,
} from "@/lib/validation/breakdown";
import type { ElementCategory } from "@/app/generated/prisma/client";

export type BreakdownState = { error?: string } | undefined;

export async function uploadScriptAction(
  projectId: string,
  _prev: BreakdownState,
  formData: FormData,
): Promise<BreakdownState> {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "SCRIPT_BREAKDOWN")) {
    return { error: "Not permitted." };
  }
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Choose a script file." };

  const { fileUrl, fileName } = await saveUploadedFile(file, `scripts/${projectId}`);
  await prisma.project.update({
    where: { id: projectId },
    data: { scriptFileUrl: fileUrl, scriptFileName: fileName },
  });
  await recordAudit({
    entityType: "Project",
    entityId: projectId,
    action: "SCRIPT_UPLOAD",
    userId: session.user.id,
    after: { fileName },
  });
  revalidatePath(`/projects/${projectId}/breakdown`);
  return {};
}

export async function createSceneAction(
  projectId: string,
  _prev: BreakdownState,
  formData: FormData,
): Promise<BreakdownState> {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "SCRIPT_BREAKDOWN")) {
    return { error: "Not permitted." };
  }
  const pagesRaw = (formData.get("pageEighths") as string) || "";
  const parsed = sceneFormSchema.safeParse({
    number: formData.get("number"),
    intExt: formData.get("intExt"),
    setName: formData.get("setName"),
    time: formData.get("time"),
    pageEighths: pagesRaw ? Number(pagesRaw) : undefined,
    synopsis: formData.get("synopsis"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please fix the form." };
  }

  const last = await prisma.scene.findFirst({
    where: { projectId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  await prisma.scene.create({
    data: {
      projectId,
      number: parsed.data.number,
      intExt: parsed.data.intExt,
      setName: parsed.data.setName,
      time: parsed.data.time,
      pageEighths: parsed.data.pageEighths ?? null,
      synopsis: parsed.data.synopsis || null,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });
  revalidatePath(`/projects/${projectId}/breakdown`);
  return {};
}

export async function deleteSceneAction(sceneId: string) {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "SCRIPT_BREAKDOWN")) {
    redirect("/forbidden");
  }
  const scene = await prisma.scene.findUnique({
    where: { id: sceneId },
    select: { projectId: true },
  });
  if (!scene) return;
  await prisma.scene.delete({ where: { id: sceneId } });
  revalidatePath(`/projects/${scene.projectId}/breakdown`);
  redirect(`/projects/${scene.projectId}/breakdown`);
}

export async function saveElementsAction(
  sceneId: string,
  _prev: BreakdownState,
  formData: FormData,
): Promise<BreakdownState> {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "SCRIPT_BREAKDOWN")) {
    return { error: "Not permitted." };
  }
  const scene = await prisma.scene.findUnique({
    where: { id: sceneId },
    select: { projectId: true },
  });
  if (!scene) return { error: "Scene not found." };

  let raw: unknown;
  try {
    raw = JSON.parse((formData.get("elements") as string) || "[]");
  } catch {
    return { error: "Could not read elements." };
  }
  const parsed = elementsSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid elements." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.breakdownElement.deleteMany({ where: { sceneId } });
    if (parsed.data.length > 0) {
      await tx.breakdownElement.createMany({
        data: parsed.data.map((e) => ({
          sceneId,
          category: e.category as ElementCategory,
          name: e.name,
          qty: e.qty,
          notes: e.notes || null,
          estimatedCost: e.estimatedCost ?? null,
        })),
      });
    }
  });
  revalidatePath(`/projects/${scene.projectId}/breakdown/${sceneId}`);
  revalidatePath(`/projects/${scene.projectId}/breakdown`);
  return {};
}

/**
 * Bridge: aggregate breakdown element estimates by category and seed a new
 * DRAFT production-budget version with one line per category. Requires budget
 * edit rights (this writes budget data).
 */
export async function seedBudgetFromBreakdownAction(projectId: string) {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "PRODUCTION_BUDGET")) {
    redirect("/forbidden");
  }

  const elements = await prisma.breakdownElement.findMany({
    where: { scene: { projectId }, estimatedCost: { not: null } },
    select: { category: true, estimatedCost: true, qty: true },
  });

  const byCategory = new Map<ElementCategory, number>();
  for (const e of elements) {
    const cost = Number(e.estimatedCost) * e.qty;
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + cost);
  }
  if (byCategory.size === 0) {
    redirect(`/projects/${projectId}/breakdown`);
  }

  const [project, latest] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { currency: true } }),
    prisma.budgetHeader.findFirst({
      where: { projectId },
      orderBy: { version: "desc" },
      select: { version: true },
    }),
  ]);

  let headerId = "";
  await prisma.$transaction(async (tx) => {
    const header = await tx.budgetHeader.create({
      data: {
        projectId,
        version: (latest?.version ?? 0) + 1,
        status: "DRAFT",
        notes: "Seeded from script breakdown",
      },
    });
    headerId = header.id;
    let sort = 0;
    for (const [category, amount] of byCategory) {
      await tx.budgetLine.create({
        data: {
          budgetHeaderId: header.id,
          department: "Production",
          category: ELEMENT_LABEL[category],
          description: `Estimated from script breakdown (${ELEMENT_LABEL[category]})`,
          approvedAmount: Math.round(amount * 100) / 100,
          currency: project?.currency ?? "INR",
          sortOrder: sort++,
        },
      });
    }
  });

  await recordAudit({
    entityType: "BudgetHeader",
    entityId: headerId,
    action: "SEED_FROM_BREAKDOWN",
    userId: session.user.id,
    after: { categories: byCategory.size },
  });

  revalidatePath(`/projects/${projectId}/budget`);
  redirect(`/projects/${projectId}/budget`);
}
