import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireView } from "@/lib/require-access";
import { canEdit } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PoStatus } from "@/app/generated/prisma/client";

const STATUS_BADGE: Record<
  PoStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
> = {
  DRAFT: { label: "Draft", variant: "outline" },
  PENDING_APPROVAL: { label: "Pending", variant: "secondary" },
  APPROVED: { label: "Approved", variant: "default", className: "bg-hc-success text-white" },
  PARTIALLY_FULFILLED: { label: "Partial", variant: "secondary" },
  CLOSED: { label: "Closed", variant: "outline" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
};

export default async function PurchaseOrdersPage() {
  const session = await requireView("PO");
  const canCreate = canEdit(session.user.role, "PO");

  const pos = await prisma.purchaseOrder.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      project: { select: { code: true, title: true } },
      vendor: { select: { legalName: true } },
      lines: { select: { amount: true } },
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Purchase Orders</h1>
          <p className="text-sm text-muted-foreground">
            {pos.length} PO{pos.length === 1 ? "" : "s"}
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/purchase-orders/new">New PO</Link>
          </Button>
        )}
      </div>

      <div className="mt-6 rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO #</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No purchase orders yet.
                </TableCell>
              </TableRow>
            ) : (
              pos.map((po) => {
                const total = po.lines.reduce((s, l) => s + Number(l.amount), 0);
                return (
                  <TableRow key={po.id}>
                    <TableCell className="font-mono text-xs">
                      <Link href={`/purchase-orders/${po.id}`} className="hover:underline">
                        {po.poNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="font-mono text-xs text-muted-foreground">{po.project.code}</span>{" "}
                      {po.project.title}
                    </TableCell>
                    <TableCell>{po.vendor.legalName}</TableCell>
                    <TableCell className="text-right font-mono">
                      ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={STATUS_BADGE[po.status].variant}
                        className={STATUS_BADGE[po.status].className}
                      >
                        {STATUS_BADGE[po.status].label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
