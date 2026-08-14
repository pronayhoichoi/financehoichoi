"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTaskAction, deleteTaskAction, moveTaskAction, type TaskState } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  DONE: "Done",
};

export function AddTaskForm({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState<TaskState, FormData>(
    createTaskAction.bind(null, projectId),
    undefined,
  );
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-md border p-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="title" className="text-xs">Task *</Label>
        <Input id="title" name="title" placeholder="Lock location permits" className="w-64" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="assignee" className="text-xs">Assignee</Label>
        <Input id="assignee" name="assignee" className="w-40" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="dueDate" className="text-xs">Due</Label>
        <Input id="dueDate" name="dueDate" type="date" />
      </div>
      <Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add task"}</Button>
      {state?.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

export function TaskCard({
  task,
  editable,
}: {
  task: { id: string; title: string; assignee: string | null; dueLabel: string | null; status: string };
  editable: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <div className="rounded-md border bg-card p-3 text-sm shadow-sm">
      <div className="font-medium">{task.title}</div>
      <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
        {task.assignee && <span>{task.assignee}</span>}
        {task.dueLabel && <span>Due {task.dueLabel}</span>}
      </div>
      {editable && (
        <div className="mt-2 flex items-center gap-2">
          <select
            className="h-7 rounded-md border border-input bg-transparent px-2 text-xs"
            value={task.status}
            disabled={busy}
            onChange={async (e) => {
              setBusy(true);
              await moveTaskAction(task.id, e.target.value);
              setBusy(false);
              router.refresh();
            }}
          >
            {Object.entries(STATUS_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await deleteTaskAction(task.id);
              setBusy(false);
              router.refresh();
            }}
          >
            ✕
          </Button>
        </div>
      )}
    </div>
  );
}
