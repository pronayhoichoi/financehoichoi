"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadStoryboardFrameAction, type GalleryState } from "./actions";

export function StoryboardUploadForm({
  projectId,
  scenes,
}: {
  projectId: string;
  scenes: { id: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState<GalleryState, FormData>(
    uploadStoryboardFrameAction.bind(null, projectId),
    undefined,
  );
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-md border p-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="file" className="text-xs">Frame image</Label>
        <Input id="file" name="file" type="file" accept="image/*" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="caption" className="text-xs">Caption</Label>
        <Input id="caption" name="caption" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="sceneId" className="text-xs">Scene (optional)</Label>
        <select
          id="sceneId"
          name="sceneId"
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          defaultValue=""
        >
          <option value="">— none —</option>
          {scenes.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={pending}>{pending ? "Uploading…" : "Add frame"}</Button>
      {state?.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
