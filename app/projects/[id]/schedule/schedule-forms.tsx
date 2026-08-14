"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addCrewCallAction,
  assignSceneAction,
  createShootDayAction,
  type ScheduleState,
} from "./actions";

const selectCls = "h-9 rounded-md border border-input bg-transparent px-3 text-sm";

export function CreateShootDayForm({
  projectId,
  locations,
}: {
  projectId: string;
  locations: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<ScheduleState, FormData>(
    createShootDayAction.bind(null, projectId),
    undefined,
  );
  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-md border p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="date" className="text-xs">Date</Label>
          <Input id="date" name="date" type="date" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="unit" className="text-xs">Unit</Label>
          <Input id="unit" name="unit" placeholder="Main Unit" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="locationId" className="text-xs">Location</Label>
          <select id="locationId" name="locationId" className={selectCls} defaultValue="">
            <option value="">— none —</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="generalCallTime" className="text-xs">General call</Label>
          <Input id="generalCallTime" name="generalCallTime" placeholder="07:00" />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="notes" className="text-xs">Notes</Label>
        <Input id="notes" name="notes" />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add shoot day"}
        </Button>
      </div>
    </form>
  );
}

export function AssignSceneControl({
  shootDayId,
  unscheduled,
}: {
  shootDayId: string;
  unscheduled: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [sceneId, setSceneId] = useState("");
  const [busy, setBusy] = useState(false);
  if (unscheduled.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <select className={selectCls} value={sceneId} onChange={(e) => setSceneId(e.target.value)}>
        <option value="">Assign a scene…</option>
        {unscheduled.map((s) => (
          <option key={s.id} value={s.id}>{s.label}</option>
        ))}
      </select>
      <Button
        size="sm"
        variant="outline"
        disabled={!sceneId || busy}
        onClick={async () => {
          setBusy(true);
          await assignSceneAction(sceneId, shootDayId);
          setBusy(false);
          setSceneId("");
          router.refresh();
        }}
      >
        Add
      </Button>
    </div>
  );
}

export function AddCrewForm({
  shootDayId,
  contacts,
}: {
  shootDayId: string;
  contacts: { id: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState<ScheduleState, FormData>(
    addCrewCallAction.bind(null, shootDayId),
    undefined,
  );
  if (contacts.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Add people in the Crew directory to build call sheets.
      </p>
    );
  }
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <Label htmlFor="contactId" className="text-xs">Crew member</Label>
        <select id="contactId" name="contactId" className={selectCls} defaultValue="">
          <option value="">Pick…</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="callTime" className="text-xs">Call time</Label>
        <Input id="callTime" name="callTime" placeholder="06:30" className="w-24" />
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "…" : "Add call"}
      </Button>
      {state?.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
