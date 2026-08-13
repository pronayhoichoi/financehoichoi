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
import type { ProjectStatus } from "@/app/generated/prisma/client";

const STATUS_LABEL: Record<ProjectStatus, string> = {
  PRE_PRODUCTION: "Pre-production",
  PRODUCTION: "Production",
  POST: "Post",
  RELEASED: "Released",
  ARCHIVED: "Archived",
};

const STATUS_VARIANT: Record<
  ProjectStatus,
  "default" | "secondary" | "outline"
> = {
  PRE_PRODUCTION: "outline",
  PRODUCTION: "default",
  POST: "secondary",
  RELEASED: "secondary",
  ARCHIVED: "outline",
};

export default async function ProjectsPage() {
  const session = await requireView("PROJECT");
  const canCreate = canEdit(session.user.role, "PROJECT");

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { purchaseOrders: true, budgets: true } } },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">
            {projects.length} production{projects.length === 1 ? "" : "s"}
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/projects/new">New project</Link>
          </Button>
        )}
      </div>

      <div className="mt-6 rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Budgets</TableHead>
              <TableHead className="text-right">POs</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No projects yet.
                </TableCell>
              </TableRow>
            ) : (
              projects.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">
                    <Link href={`/projects/${p.id}`} className="hover:underline">
                      {p.code}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/projects/${p.id}`} className="hover:underline">
                      {p.title}
                    </Link>
                  </TableCell>
                  <TableCell>{p.type.charAt(0) + p.type.slice(1).toLowerCase()}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[p.status]}>
                      {STATUS_LABEL[p.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{p._count.budgets}</TableCell>
                  <TableCell className="text-right">{p._count.purchaseOrders}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
