"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/rbac";
import { saveUploadedFile } from "@/lib/storage";

export type MoodState = { error?: string } | undefined;

export async function uploadMoodImageAction(
  projectId: string,
  _prev: MoodState,
  formData: FormData,
): Promise<MoodState> {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "SCRIPT_BREAKDOWN")) {
    return { error: "Not permitted." };
  }
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Choose an image." };

  const { fileUrl, fileName } = await saveUploadedFile(file, `moodboards/${projectId}`);
  const last = await prisma.moodBoardImage.findFirst({
    where: { projectId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  await prisma.moodBoardImage.create({
    data: {
      projectId,
      imageUrl: fileUrl,
      imageName: fileName,
      caption: ((formData.get("caption") as string) || "").trim() || null,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });
  revalidatePath(`/projects/${projectId}/moodboard`);
  return {};
}

export async function deleteMoodImageAction(imageId: string) {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "SCRIPT_BREAKDOWN")) redirect("/forbidden");
  const img = await prisma.moodBoardImage.findUnique({
    where: { id: imageId },
    select: { projectId: true },
  });
  if (!img) return;
  await prisma.moodBoardImage.delete({ where: { id: imageId } });
  revalidatePath(`/projects/${img.projectId}/moodboard`);
}
