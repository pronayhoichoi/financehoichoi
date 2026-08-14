"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createSceneAction,
  uploadScriptAction,
  type BreakdownState,
} from "./actions";

const selectCls = "h-9 rounded-md border border-input bg-transparent px-3 text-sm";

export function ScriptUpload({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState<BreakdownState, FormData>(
    uploadScriptAction.bind(null, projectId),
    undefined,
  );
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="file">Upload script (PDF)</Label>
        <Input id="file" name="file" type="file" accept=".pdf,.txt,.fountain,.fdx" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Uploading…" : "Upload"}
      </Button>
      {state?.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

export function AddSceneForm({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState<BreakdownState, FormData>(
    createSceneAction.bind(null, projectId),
    undefined,
  );
  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-md border p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <div className="flex flex-col gap-1">
          <Label htmlFor="number" className="text-xs">Scene #</Label>
          <Input id="number" name="number" placeholder="1" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="intExt" className="text-xs">INT/EXT</Label>
          <select id="intExt" name="intExt" className={selectCls} defaultValue="INT">
            <option value="INT">INT</option>
            <option value="EXT">EXT</option>
            <option value="INT_EXT">INT/EXT</option>
          </select>
        </div>
        <div className="col-span-2 flex flex-col gap-1">
          <Label htmlFor="setName" className="text-xs">Set / location</Label>
          <Input id="setName" name="setName" placeholder="Rahul's apartment" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="time" className="text-xs">Time</Label>
          <select id="time" name="time" className={selectCls} defaultValue="DAY">
            <option value="DAY">DAY</option>
            <option value="NIGHT">NIGHT</option>
            <option value="DAWN">DAWN</option>
            <option value="DUSK">DUSK</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="pageEighths" className="text-xs">Pages (⅛)</Label>
          <Input id="pageEighths" name="pageEighths" type="number" placeholder="8" />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="synopsis" className="text-xs">Synopsis</Label>
        <Input id="synopsis" name="synopsis" placeholder="Short scene description" />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add scene"}
        </Button>
      </div>
    </form>
  );
}
