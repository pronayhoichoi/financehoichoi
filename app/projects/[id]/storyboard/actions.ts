"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/rbac";
import { saveUploadedFile } from "@/lib/storage";

export type GalleryState = { error?: string } | undefined;

export async function uploadStoryboardFrameAction(
  projectId: string,
  _prev: GalleryState,
  formData: FormData,
): Promise<GalleryState> {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "SCRIPT_BREAKDOWN")) {
    return { error: "Not permitted." };
  }
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Choose an image." };

  const { fileUrl, fileName } = await saveUploadedFile(file, `storyboards/${projectId}`);
  const last = await prisma.storyboardFrame.findFirst({
    where: { projectId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const sceneId = ((formData.get("sceneId") as string) || "").trim();
  await prisma.storyboardFrame.create({
    data: {
      projectId,
      sceneId: sceneId || null,
      imageUrl: fileUrl,
      imageName: fileName,
      caption: ((formData.get("caption") as string) || "").trim() || null,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });
  revalidatePath(`/projects/${projectId}/storyboard`);
  return {};
}

export async function deleteStoryboardFrameAction(frameId: string) {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "SCRIPT_BREAKDOWN")) redirect("/forbidden");
  const frame = await prisma.storyboardFrame.findUnique({
    where: { id: frameId },
    select: { projectId: true },
  });
  if (!frame) return;
  await prisma.storyboardFrame.delete({ where: { id: frameId } });
  revalidatePath(`/projects/${frame.projectId}/storyboard`);
}
