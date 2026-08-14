"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/rbac";
import type { TaskStatus } from "@/app/generated/prisma/client";

export type TaskState = { error?: string } | undefined;

const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"];

export async function createTaskAction(
  projectId: string,
  _prev: TaskState,
  formData: FormData,
): Promise<TaskState> {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "SCHEDULE")) {
    return { error: "Not permitted." };
  }
  const title = ((formData.get("title") as string) || "").trim();
  if (!title) return { error: "Task title is required." };

  const dueRaw = (formData.get("dueDate") as string) || "";
  const last = await prisma.task.findFirst({
    where: { projectId, status: "TODO" },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  await prisma.task.create({
    data: {
      projectId,
      title,
      description: ((formData.get("description") as string) || "").trim() || null,
      assignee: ((formData.get("assignee") as string) || "").trim() || null,
      dueDate: dueRaw ? new Date(dueRaw) : null,
      status: "TODO",
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });
  revalidatePath(`/projects/${projectId}/tasks`);
  return {};
}

export async function moveTaskAction(taskId: string, status: string) {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "SCHEDULE")) redirect("/forbidden");
  if (!STATUSES.includes(status as TaskStatus)) return;
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { projectId: true },
  });
  if (!task) return;
  await prisma.task.update({ where: { id: taskId }, data: { status: status as TaskStatus } });
  revalidatePath(`/projects/${task.projectId}/tasks`);
}

export async function deleteTaskAction(taskId: string) {
  const session = await auth();
  if (!session?.user || !canEdit(session.user.role, "SCHEDULE")) redirect("/forbidden");
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { projectId: true },
  });
  if (!task) return;
  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath(`/projects/${task.projectId}/tasks`);
}
