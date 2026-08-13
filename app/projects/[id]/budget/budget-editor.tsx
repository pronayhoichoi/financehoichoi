"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveBudgetLinesAction, type BudgetActionState } from "./actions";

type Row = {
  department: string;
  category: string;
  ledger: string;
  description: string;
  approvedAmount: string;
};

const EMPTY: Row = {
  department: "",
  category: "",
  ledger: "",
  description: "",
  approvedAmount: "",
};

export function BudgetEditor({
  headerId,
  currency,
  initialRows,
}: {
  headerId: string;
  currency: string;
  initialRows: Row[];
}) {
  const [rows, setRows] = useState<Row[]>(
    initialRows.length ? initialRows : [{ ...EMPTY }],
  );
  const [state, formAction, pending] = useActionState<
    BudgetActionState,
    FormData
  >(saveBudgetLinesAction.bind(null, headerId), undefined);

  const update = (i: number, key: keyof Row, value: string) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)));
  const addRow = () => setRows((r) => [...r, { ...EMPTY }]);
  const removeRow = (i: number) =>
    setRows((r) => (r.length > 1 ? r.filter((_, idx) => idx !== i) : r));

  const total = rows.reduce((sum, r) => sum + (parseFloat(r.approvedAmount) || 0), 0);

  const payload = JSON.stringify(
    rows.map((r) => ({
      department: r.department,
      category: r.category,
      ledger: r.ledger,
      description: r.description,
      approvedAmount: parseFloat(r.approvedAmount) || 0,
    })),
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="lines" value={payload} />

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-2 font-medium">Department</th>
              <th className="p-2 font-medium">Category</th>
              <th className="p-2 font-medium">Ledger</th>
              <th className="p-2 font-medium">Description</th>
              <th className="p-2 text-right font-medium">Amount ({currency})</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="p-1.5">
                  <Input value={row.department} onChange={(e) => update(i, "department", e.target.value)} />
                </td>
                <td className="p-1.5">
                  <Input value={row.category} onChange={(e) => update(i, "category", e.target.value)} />
                </td>
                <td className="p-1.5">
                  <Input value={row.ledger} onChange={(e) => update(i, "ledger", e.target.value)} />
                </td>
                <td className="p-1.5">
                  <Input value={row.description} onChange={(e) => update(i, "description", e.target.value)} />
                </td>
                <td className="p-1.5">
                  <Input
                    type="number"
                    step="0.01"
                    className="text-right font-mono"
                    value={row.approvedAmount}
                    onChange={(e) => update(i, "approvedAmount", e.target.value)}
                  />
                </td>
                <td className="p-1.5 text-right">
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeRow(i)}>
                    ✕
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t font-medium">
              <td className="p-2" colSpan={4}>
                Total
              </td>
              <td className="p-2 text-right font-mono">
                {currency} {total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={addRow}>
          + Add line
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save budget"}
        </Button>
      </div>
    </form>
  );
}
