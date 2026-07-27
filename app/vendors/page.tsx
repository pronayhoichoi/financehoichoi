import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireView } from "@/lib/require-access";
import { canEdit } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { VendorStatus } from "@/app/generated/prisma/client";

const STATUS_VARIANT: Record<
  VendorStatus,
  "default" | "secondary" | "destructive"
> = {
  ACTIVE: "default",
  INACTIVE: "secondary",
  BLOCKED: "destructive",
};

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await requireView("VENDOR_MASTER");
  const canCreate = canEdit(session.user.role, "VENDOR_MASTER");

  const { q, status } = await searchParams;

  const vendors = await prisma.vendor.findMany({
    where: {
      ...(status && status !== "ALL"
        ? { status: status as VendorStatus }
        : {}),
      ...(q
        ? {
            OR: [
              { legalName: { contains: q, mode: "insensitive" } },
              { tradeName: { contains: q, mode: "insensitive" } },
              { vendorCode: { contains: q, mode: "insensitive" } },
              { pan: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Vendor Master</h1>
          <p className="text-sm text-muted-foreground">
            {vendors.length} vendor{vendors.length === 1 ? "" : "s"}
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/vendors/new">New vendor</Link>
          </Button>
        )}
      </div>

      <form className="mt-6 flex flex-wrap gap-3" method="get">
        <Input
          name="q"
          placeholder="Search name, code, PAN…"
          defaultValue={q ?? ""}
          className="max-w-xs"
        />
        <select
          name="status"
          defaultValue={status ?? "ALL"}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="BLOCKED">Blocked</option>
        </select>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      <div className="mt-6 rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Legal name</TableHead>
              <TableHead>PAN</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No vendors yet.
                </TableCell>
              </TableRow>
            ) : (
              vendors.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono text-xs">
                    <Link href={`/vendors/${v.id}`} className="hover:underline">
                      {v.vendorCode}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/vendors/${v.id}`} className="hover:underline">
                      {v.legalName}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{v.pan}</TableCell>
                  <TableCell>{v.category}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[v.status]}>{v.status}</Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
