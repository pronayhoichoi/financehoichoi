"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveShotsAction, type BreakdownState } from "../actions";

type Row = {
  number: string;
  shotSize: string;
  angle: string;
  movement: string;
  gear: string;
  description: string;
};

const EMPTY: Row = { number: "", shotSize: "", angle: "", movement: "", gear: "", description: "" };

export function ShotEditor({
  sceneId,
  initialRows,
}: {
  sceneId: string;
  initialRows: Row[];
}) {
  const [rows, setRows] = useState<Row[]>(initialRows.length ? initialRows : [{ ...EMPTY }]);
  const [state, formAction, pending] = useActionState<BreakdownState, FormData>(
    saveShotsAction.bind(null, sceneId),
    undefined,
  );

  const update = (i: number, k: keyof Row, v: string) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));
  const addRow = () => setRows((r) => [...r, { ...EMPTY }]);
  const removeRow = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));

  const payload = JSON.stringify(rows);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="shots" value={payload} />
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-2 font-medium">#</th>
              <th className="p-2 font-medium">Size</th>
              <th className="p-2 font-medium">Angle</th>
              <th className="p-2 font-medium">Movement</th>
              <th className="p-2 font-medium">Gear</th>
              <th className="p-2 font-medium">Description</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="p-1.5 w-16"><Input value={row.number} onChange={(e) => update(i, "number", e.target.value)} /></td>
                <td className="p-1.5 w-20"><Input value={row.shotSize} onChange={(e) => update(i, "shotSize", e.target.value)} placeholder="WS" /></td>
                <td className="p-1.5 w-24"><Input value={row.angle} onChange={(e) => update(i, "angle", e.target.value)} /></td>
                <td className="p-1.5 w-28"><Input value={row.movement} onChange={(e) => update(i, "movement", e.target.value)} placeholder="static" /></td>
                <td className="p-1.5 w-28"><Input value={row.gear} onChange={(e) => update(i, "gear", e.target.value)} /></td>
                <td className="p-1.5"><Input value={row.description} onChange={(e) => update(i, "description", e.target.value)} /></td>
                <td className="p-1.5 text-right"><Button type="button" variant="ghost" size="sm" onClick={() => removeRow(i)}>✕</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={addRow}>+ Add shot</Button>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save shot list"}</Button>
      </div>
    </form>
  );
}
