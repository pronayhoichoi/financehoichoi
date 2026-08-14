"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ELEMENT_CATEGORIES, ELEMENT_LABEL } from "@/lib/breakdown";
import { saveElementsAction, type BreakdownState } from "./actions";

type Row = {
  category: string;
  name: string;
  qty: string;
  estimatedCost: string;
  notes: string;
};

const EMPTY: Row = { category: "PROPS", name: "", qty: "1", estimatedCost: "", notes: "" };
const selectCls = "h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm";

export function ElementEditor({
  sceneId,
  currency,
  initialRows,
}: {
  sceneId: string;
  currency: string;
  initialRows: Row[];
}) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [state, formAction, pending] = useActionState<BreakdownState, FormData>(
    saveElementsAction.bind(null, sceneId),
    undefined,
  );

  const update = (i: number, k: keyof Row, v: string) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));
  const addRow = () => setRows((r) => [...r, { ...EMPTY }]);
  const removeRow = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));

  const total = rows.reduce(
    (s, r) => s + (parseFloat(r.estimatedCost) || 0) * (parseInt(r.qty) || 0),
    0,
  );

  const payload = JSON.stringify(
    rows.map((r) => ({
      category: r.category,
      name: r.name,
      qty: parseInt(r.qty) || 1,
      notes: r.notes,
      estimatedCost: r.estimatedCost ? parseFloat(r.estimatedCost) : undefined,
    })),
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="elements" value={payload} />

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-2 font-medium">Category</th>
              <th className="p-2 font-medium">Name</th>
              <th className="p-2 text-right font-medium">Qty</th>
              <th className="p-2 text-right font-medium">Est. cost ({currency})</th>
              <th className="p-2 font-medium">Notes</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-3 text-center text-muted-foreground">
                  No elements tagged yet.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="p-1.5">
                    <select
                      className={selectCls}
                      value={row.category}
                      onChange={(e) => update(i, "category", e.target.value)}
                    >
                      {ELEMENT_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {ELEMENT_LABEL[c]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-1.5">
                    <Input value={row.name} onChange={(e) => update(i, "name", e.target.value)} />
                  </td>
                  <td className="p-1.5 w-16">
                    <Input type="number" className="text-right font-mono" value={row.qty} onChange={(e) => update(i, "qty", e.target.value)} />
                  </td>
                  <td className="p-1.5 w-28">
                    <Input type="number" step="0.01" className="text-right font-mono" value={row.estimatedCost} onChange={(e) => update(i, "estimatedCost", e.target.value)} />
                  </td>
                  <td className="p-1.5">
                    <Input value={row.notes} onChange={(e) => update(i, "notes", e.target.value)} />
                  </td>
                  <td className="p-1.5 text-right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeRow(i)}>
                      ✕
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t font-medium">
              <td className="p-2" colSpan={3}>
                Estimated total
              </td>
              <td className="p-2 text-right font-mono">
                {total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={addRow}>
          + Add element
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save elements"}
        </Button>
      </div>
    </form>
  );
}
