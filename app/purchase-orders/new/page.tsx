import Link from "next/link";
import { requireEdit } from "@/lib/require-access";
import { prisma } from "@/lib/prisma";
import { computeLineActuals, getActiveBudget } from "@/lib/budget";
import { PoForm } from "../po-form";

export default async function NewPoPage() {
  await requireEdit("PO");

  const [projects, vendors] = await Promise.all([
    prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, code: true, title: true, currency: true },
    }),
    prisma.vendor.findMany({
      where: { status: "ACTIVE" },
      orderBy: { legalName: "asc" },
      select: { id: true, vendorCode: true, legalName: true },
    }),
  ]);

  // Active-budget lines per project, labelled with available balance.
  const budgetLinesByProject: Record<
    string,
    { id: string; label: string }[]
  > = {};
  for (const p of projects) {
    const active = await getActiveBudget(p.id);
    if (!active) {
      budgetLinesByProject[p.id] = [];
      continue;
    }
    const [lines, actuals] = await Promise.all([
      prisma.budgetLine.findMany({
        where: { budgetHeaderId: active.id },
        orderBy: { sortOrder: "asc" },
      }),
      computeLineActuals(active.id),
    ]);
    budgetLinesByProject[p.id] = lines.map((l) => {
      const avail = actuals.get(l.id)?.available ?? Number(l.approvedAmount);
      return {
        id: l.id,
        label: `${l.department} · ${l.category} — ${l.description} (avail ${p.currency} ${avail.toLocaleString("en-IN")})`,
      };
    });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/purchase-orders" className="text-sm text-muted-foreground hover:underline">
        ← Purchase Orders
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">New purchase order</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        A PO number (PO-{new Date().getFullYear()}-####) is assigned on save. POs start as
        draft; submit for approval to commit against the budget.
      </p>
      {projects.length === 0 || vendors.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You need at least one project and one active vendor before raising a PO.
        </p>
      ) : (
        <PoForm
          projects={projects}
          vendors={vendors}
          budgetLinesByProject={budgetLinesByProject}
        />
      )}
    </div>
  );
}
