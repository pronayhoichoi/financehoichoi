import Link from "next/link";
import { notFound } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireView } from "@/lib/require-access";
import { canApprove as canApproveFn, canEdit as canEditFn } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PoControls } from "./po-controls";
import type { PoStatus } from "@/app/generated/prisma/client";

const STATUS_BADGE: Record<
  PoStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
> = {
  DRAFT: { label: "Draft", variant: "outline" },
  PENDING_APPROVAL: { label: "Pending approval", variant: "secondary" },
  APPROVED: { label: "Approved", variant: "default", className: "bg-hc-success text-white" },
  PARTIALLY_FULFILLED: { label: "Partially fulfilled", variant: "secondary" },
  CLOSED: { label: "Closed", variant: "outline" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
};

export default async function PoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireView("PO");
  const role = session.user.role;

  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, code: true, title: true, currency: true } },
      vendor: { select: { legalName: true, vendorCode: true } },
      lines: { include: { budgetLine: { select: { department: true, category: true } } } },
    },
  });
  if (!po) notFound();

  const audits = await prisma.auditLog.findMany({
    where: { entityType: "PurchaseOrder", entityId: id },
    orderBy: { createdAt: "desc" },
    take: 15,
    include: { user: { select: { name: true } } },
  });

  const cur = po.project.currency;
  const subtotal = po.lines.reduce((s, l) => s + Number(l.amount), 0);
  const tax = po.lines.reduce(
    (s, l) => s + Number(l.amount) * (Number(l.taxPct ?? 0) / 100),
    0,
  );

  const money = (n: number) => `${cur} ${n.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/purchase-orders" className="text-sm text-muted-foreground hover:underline">
        ← Purchase Orders
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-semibold">{po.poNumber}</h1>
          <p className="text-sm text-muted-foreground">
            <Link href={`/projects/${po.project.id}`} className="hover:underline">
              {po.project.code} · {po.project.title}
            </Link>{" "}
            → {po.vendor.legalName} ({po.vendor.vendorCode})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_BADGE[po.status].variant} className={STATUS_BADGE[po.status].className}>
            {STATUS_BADGE[po.status].label}
          </Badge>
          <Button asChild variant="outline" size="sm">
            <Link href={`/purchase-orders/${id}/print`} target="_blank">
              Print / PDF
            </Link>
          </Button>
        </div>
      </div>

      {po.budgetOverride && (
        <p className="mt-3 text-xs text-destructive">
          Approved with a budget override.
        </p>
      )}

      <Separator className="my-6" />

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Budget line</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Tax %</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {po.lines.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{l.description}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {l.budgetLine ? `${l.budgetLine.department} · ${l.budgetLine.category}` : "—"}
                </TableCell>
                <TableCell className="text-right font-mono">{Number(l.qty)}</TableCell>
                <TableCell className="text-right font-mono">{money(Number(l.rate))}</TableCell>
                <TableCell className="text-right font-mono">
                  {l.taxPct != null ? `${Number(l.taxPct)}%` : "—"}
                </TableCell>
                <TableCell className="text-right font-mono">{money(Number(l.amount))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 ml-auto w-64 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-mono">{money(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax</span>
          <span className="font-mono">{money(tax)}</span>
        </div>
        <div className="flex justify-between border-t pt-1 font-semibold">
          <span>Total</span>
          <span className="font-mono">{money(subtotal + tax)}</span>
        </div>
      </div>

      {po.notes && (
        <p className="mt-4 text-sm">
          <span className="text-muted-foreground">Notes: </span>
          {po.notes}
        </p>
      )}
      {po.deliveryDate && (
        <p className="mt-1 text-sm text-muted-foreground">
          Delivery: {format(po.deliveryDate, "dd MMM yyyy")}
        </p>
      )}

      <Separator className="my-6" />

      <PoControls
        poId={po.id}
        status={po.status}
        canEdit={canEditFn(role, "PO")}
        canApprove={canApproveFn(role, "PO")}
      />

      <Separator className="my-6" />

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Audit trail</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {audits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground">
                  No audit entries.
                </TableCell>
              </TableRow>
            ) : (
              audits.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDistanceToNow(a.createdAt, { addSuffix: true })}
                  </TableCell>
                  <TableCell>{a.action}</TableCell>
                  <TableCell className="text-xs">{a.user?.name ?? "System"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
