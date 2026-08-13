"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPoAction, type PoActionState } from "./actions";

type Project = { id: string; code: string; title: string };
type Vendor = { id: string; vendorCode: string; legalName: string };
type BudgetLineOpt = { id: string; label: string };

type Row = {
  budgetLineId: string;
  description: string;
  qty: string;
  rate: string;
  taxPct: string;
};

const EMPTY: Row = { budgetLineId: "", description: "", qty: "1", rate: "", taxPct: "" };

const selectCls =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

export function PoForm({
  projects,
  vendors,
  budgetLinesByProject,
}: {
  projects: Project[];
  vendors: Vendor[];
  budgetLinesByProject: Record<string, BudgetLineOpt[]>;
}) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [vendorId, setVendorId] = useState(vendors[0]?.id ?? "");
  const [rows, setRows] = useState<Row[]>([{ ...EMPTY }]);
  const [state, formAction, pending] = useActionState<PoActionState, FormData>(
    createPoAction,
    undefined,
  );

  const budgetLines = budgetLinesByProject[projectId] ?? [];

  const update = (i: number, key: keyof Row, value: string) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)));
  const addRow = () => setRows((r) => [...r, { ...EMPTY }]);
  const removeRow = (i: number) =>
    setRows((r) => (r.length > 1 ? r.filter((_, idx) => idx !== i) : r));

  const total = useMemo(
    () => rows.reduce((s, r) => s + (parseFloat(r.qty) || 0) * (parseFloat(r.rate) || 0), 0),
    [rows],
  );

  const payload = JSON.stringify(
    rows.map((r) => ({
      budgetLineId: r.budgetLineId,
      description: r.description,
      qty: parseFloat(r.qty) || 0,
      rate: parseFloat(r.rate) || 0,
      taxPct: r.taxPct ? parseFloat(r.taxPct) : undefined,
    })),
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state?.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="vendorId" value={vendorId} />
      <input type="hidden" name="lines" value={payload} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label>Project *</Label>
          <select
            className={selectCls}
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Vendor *</Label>
          <select
            className={selectCls}
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
          >
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.vendorCode} — {v.legalName}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="deliveryDate">Delivery / timeline</Label>
          <Input id="deliveryDate" name="deliveryDate" type="date" />
        </div>
      </div>

      {budgetLines.length === 0 && (
        <p className="text-xs text-muted-foreground">
          This project has no approved budget, so lines won&apos;t be committed against a
          budget line. Approve a budget first to enable budget tracking.
        </p>
      )}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-2 font-medium">Budget line</th>
              <th className="p-2 font-medium">Description</th>
              <th className="p-2 text-right font-medium">Qty</th>
              <th className="p-2 text-right font-medium">Rate</th>
              <th className="p-2 text-right font-medium">Tax %</th>
              <th className="p-2 text-right font-medium">Amount</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const amt = (parseFloat(row.qty) || 0) * (parseFloat(row.rate) || 0);
              return (
                <tr key={i} className="border-b last:border-0">
                  <td className="p-1.5">
                    <select
                      className={selectCls}
                      value={row.budgetLineId}
                      onChange={(e) => update(i, "budgetLineId", e.target.value)}
                    >
                      <option value="">— none —</option>
                      {budgetLines.map((bl) => (
                        <option key={bl.id} value={bl.id}>
                          {bl.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-1.5">
                    <Input value={row.description} onChange={(e) => update(i, "description", e.target.value)} />
                  </td>
                  <td className="p-1.5 w-20">
                    <Input type="number" step="0.01" className="text-right font-mono" value={row.qty} onChange={(e) => update(i, "qty", e.target.value)} />
                  </td>
                  <td className="p-1.5 w-28">
                    <Input type="number" step="0.01" className="text-right font-mono" value={row.rate} onChange={(e) => update(i, "rate", e.target.value)} />
                  </td>
                  <td className="p-1.5 w-20">
                    <Input type="number" step="0.01" className="text-right font-mono" value={row.taxPct} onChange={(e) => update(i, "taxPct", e.target.value)} />
                  </td>
                  <td className="p-2 text-right font-mono">
                    {amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-1.5 text-right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeRow(i)}>
                      ✕
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t font-medium">
              <td className="p-2" colSpan={5}>
                Total (pre-tax)
              </td>
              <td className="p-2 text-right font-mono">
                {total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={addRow}>
          + Add line
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create PO (draft)"}
        </Button>
      </div>
    </form>
  );
}
