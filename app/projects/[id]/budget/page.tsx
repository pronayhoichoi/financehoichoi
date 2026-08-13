import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireView } from "@/lib/require-access";
import { canApprove as canApproveFn, canEdit as canEditFn } from "@/lib/rbac";
import { computeLineActuals } from "@/lib/budget";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BudgetEditor } from "./budget-editor";
import {
  approveBudgetAction,
  createBudgetAction,
  createRevisionAction,
  submitBudgetAction,
} from "./actions";
import type { BudgetStatus } from "@/app/generated/prisma/client";

const STATUS_BADGE: Record<
  BudgetStatus,
  { label: string; variant: "default" | "secondary" | "outline"; className?: string }
> = {
  DRAFT: { label: "Draft", variant: "outline" },
  PENDING_APPROVAL: { label: "Pending approval", variant: "secondary" },
  APPROVED: { label: "Approved", variant: "default", className: "bg-hc-success text-white" },
  REVISION: { label: "Superseded", variant: "outline" },
};

function money(n: number, currency: string) {
  return `${currency} ${n.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export default async function BudgetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireView("PRODUCTION_BUDGET");
  const role = session.user.role;
  const canEdit = canEditFn(role, "PRODUCTION_BUDGET");
  const canApprove = canApproveFn(role, "PRODUCTION_BUDGET");

  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, title: true, code: true, currency: true },
  });
  if (!project) notFound();

  const header = await prisma.budgetHeader.findFirst({
    where: { projectId: id },
    orderBy: { version: "desc" },
    include: { lines: { orderBy: { sortOrder: "asc" } } },
  });

  const editable = header && (header.status === "DRAFT" || header.status === "REVISION");
  const actuals =
    header && header.status === "APPROVED"
      ? await computeLineActuals(header.id)
      : null;

  const total = header
    ? header.lines.reduce((s, l) => s + Number(l.approvedAmount), 0)
    : 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href={`/projects/${id}`} className="text-sm text-muted-foreground hover:underline">
        ← {project.title}
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Production Budget</h1>
          <p className="font-mono text-sm text-muted-foreground">{project.code}</p>
        </div>
        {header && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">v{header.version}</span>
            <Badge variant={STATUS_BADGE[header.status].variant} className={STATUS_BADGE[header.status].className}>
              {STATUS_BADGE[header.status].label}
            </Badge>
          </div>
        )}
      </div>

      <Separator className="my-6" />

      {!header && (
        <div className="rounded-md border p-6 text-center">
          <p className="text-sm text-muted-foreground">No budget created yet.</p>
          {canEdit && (
            <form action={createBudgetAction.bind(null, id)} className="mt-4">
              <Button type="submit">Create budget</Button>
            </form>
          )}
        </div>
      )}

      {header && editable && canEdit && (
        <div className="flex flex-col gap-6">
          <BudgetEditor
            headerId={header.id}
            currency={project.currency}
            initialRows={header.lines.map((l) => ({
              department: l.department,
              category: l.category,
              ledger: l.ledger ?? "",
              description: l.description,
              approvedAmount: String(l.approvedAmount),
            }))}
          />
          <div className="flex items-center gap-3">
            <form action={submitBudgetAction.bind(null, header.id)}>
              <Button type="submit" variant="outline" disabled={header.lines.length === 0}>
                Submit for approval
              </Button>
            </form>
            <span className="text-xs text-muted-foreground">
              Save your lines first, then submit. Approval locks the budget.
            </span>
          </div>
        </div>
      )}

      {header && !editable && (
        <div className="flex flex-col gap-6">
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2 font-medium">Department</th>
                  <th className="p-2 font-medium">Category</th>
                  <th className="p-2 font-medium">Description</th>
                  <th className="p-2 text-right font-medium">Approved</th>
                  {actuals && <th className="p-2 text-right font-medium">Committed</th>}
                  {actuals && <th className="p-2 text-right font-medium">Available</th>}
                </tr>
              </thead>
              <tbody>
                {header.lines.map((l) => {
                  const a = actuals?.get(l.id);
                  return (
                    <tr key={l.id} className="border-b last:border-0">
                      <td className="p-2">{l.department}</td>
                      <td className="p-2">{l.category}</td>
                      <td className="p-2">{l.description}</td>
                      <td className="p-2 text-right font-mono">
                        {money(Number(l.approvedAmount), l.currency)}
                      </td>
                      {actuals && (
                        <td className="p-2 text-right font-mono">
                          {money(a?.committed ?? 0, l.currency)}
                        </td>
                      )}
                      {actuals && (
                        <td
                          className={`p-2 text-right font-mono ${
                            (a?.available ?? 0) < 0 ? "text-destructive" : ""
                          }`}
                        >
                          {money(a?.available ?? 0, l.currency)}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t font-medium">
                  <td className="p-2" colSpan={3}>
                    Total
                  </td>
                  <td className="p-2 text-right font-mono">{money(total, project.currency)}</td>
                  {actuals && <td />}
                  {actuals && <td />}
                </tr>
              </tfoot>
            </table>
          </div>

          {header.status === "PENDING_APPROVAL" && canApprove && (
            <form action={approveBudgetAction.bind(null, header.id)}>
              <Button type="submit">Approve budget</Button>
            </form>
          )}
          {header.status === "PENDING_APPROVAL" && !canApprove && (
            <p className="text-sm text-muted-foreground">Awaiting Finance Head approval.</p>
          )}
          {header.status === "APPROVED" && canEdit && (
            <form action={createRevisionAction.bind(null, id)}>
              <Button type="submit" variant="outline">
                Create revision
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
