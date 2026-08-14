"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadMoodImageAction, type MoodState } from "./actions";

export function MoodUploadForm({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState<MoodState, FormData>(
    uploadMoodImageAction.bind(null, projectId),
    undefined,
  );
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-md border p-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="file" className="text-xs">Image</Label>
        <Input id="file" name="file" type="file" accept="image/*" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="caption" className="text-xs">Caption</Label>
        <Input id="caption" name="caption" />
      </div>
      <Button type="submit" disabled={pending}>{pending ? "Uploading…" : "Add image"}</Button>
      {state?.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
