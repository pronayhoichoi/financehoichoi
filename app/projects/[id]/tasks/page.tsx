import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireView } from "@/lib/require-access";
import { canEdit } from "@/lib/rbac";
import { Separator } from "@/components/ui/separator";
import { AddTaskForm, TaskCard } from "./tasks-client";
import type { TaskStatus } from "@/app/generated/prisma/client";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "TODO", label: "To do" },
  { status: "IN_PROGRESS", label: "In progress" },
  { status: "BLOCKED", label: "Blocked" },
  { status: "DONE", label: "Done" },
];

export default async function TasksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireView("SCHEDULE");
  const editable = canEdit(session.user.role, "SCHEDULE");

  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, title: true, code: true },
  });
  if (!project) notFound();

  const tasks = await prisma.task.findMany({
    where: { projectId: id },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href={`/projects/${id}`} className="text-sm text-muted-foreground hover:underline">
        ← {project.title}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">Task Board</h1>
      <p className="font-mono text-sm text-muted-foreground">{project.code}</p>

      <Separator className="my-6" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.status);
          return (
            <div key={col.status} className="flex flex-col gap-2 rounded-md bg-muted/40 p-3">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>{col.label}</span>
                <span className="text-muted-foreground">{colTasks.length}</span>
              </div>
              {colTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground">—</p>
              ) : (
                colTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    editable={editable}
                    task={{
                      id: t.id,
                      title: t.title,
                      assignee: t.assignee,
                      dueLabel: t.dueDate ? format(t.dueDate, "dd MMM") : null,
                      status: t.status,
                    }}
                  />
                ))
              )}
            </div>
          );
        })}
      </div>

      {editable && (
        <div className="mt-6">
          <AddTaskForm projectId={id} />
        </div>
      )}
    </div>
  );
}
