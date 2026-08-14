import Link from "next/link";
import { notFound } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireView } from "@/lib/require-access";
import { canEdit as canEditModule } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { updateProjectAction } from "../actions";
import { ProjectForm } from "../project-form";
import type { BudgetStatus, ProjectStatus } from "@/app/generated/prisma/client";

const BUDGET_STATUS_LABEL: Record<BudgetStatus, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending approval",
  APPROVED: "Approved",
  REVISION: "Superseded",
};

const STATUS_LABEL: Record<ProjectStatus, string> = {
  PRE_PRODUCTION: "Pre-production",
  PRODUCTION: "Production",
  POST: "Post",
  RELEASED: "Released",
  ARCHIVED: "Archived",
};

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value || "—"}</dd>
    </>
  );
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireView("PROJECT");
  const canEdit = canEditModule(session.user.role, "PROJECT");

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) notFound();

  const latestBudget = await prisma.budgetHeader.findFirst({
    where: { projectId: id },
    orderBy: { version: "desc" },
    include: { _count: { select: { lines: true } } },
  });

  const audits = await prisma.auditLog.findMany({
    where: { entityType: "Project", entityId: id },
    orderBy: { createdAt: "desc" },
    take: 15,
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/projects" className="text-sm text-muted-foreground hover:underline">
        ← Projects
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{project.title}</h1>
          <p className="font-mono text-sm text-muted-foreground">{project.code}</p>
        </div>
        <Badge>{STATUS_LABEL[project.status]}</Badge>
      </div>

      <Separator className="my-6" />

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Overview</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <Row label="Type" value={project.type.charAt(0) + project.type.slice(1).toLowerCase()} />
          <Row label="Genre" value={project.genre} />
          <Row label="Producer" value={project.producer} />
          <Row label="Business unit" value={project.businessUnit} />
          <Row
            label="Start date"
            value={project.startDate ? format(project.startDate, "dd MMM yyyy") : null}
          />
          <Row
            label="End date"
            value={project.endDate ? format(project.endDate, "dd MMM yyyy") : null}
          />
          <Row label="Currency" value={project.currency} />
          <Row label="Commissioned" value={project.commissioned ? "Yes" : "No"} />
        </dl>
      </section>

      <Separator className="my-6" />

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">Script Breakdown</h2>
          <Button asChild variant="outline" size="sm">
            <Link href={`/projects/${id}/breakdown`}>Open breakdown</Link>
          </Button>
        </div>
      </section>

      <Separator className="my-6" />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">Production Budget</h2>
          <Button asChild variant="outline" size="sm">
            <Link href={`/projects/${id}/budget`}>Open budget</Link>
          </Button>
        </div>
        {latestBudget ? (
          <p className="text-sm">
            Version {latestBudget.version} · {BUDGET_STATUS_LABEL[latestBudget.status]} ·{" "}
            {latestBudget._count.lines} line{latestBudget._count.lines === 1 ? "" : "s"}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No budget created yet.</p>
        )}
      </section>

      {/* Purchase Orders for this project are shown via the Purchase Orders module. */}

      {canEdit && (
        <>
          <Separator className="my-6" />
          <section>
            <h2 className="mb-4 text-sm font-semibold text-muted-foreground">Edit project</h2>
            <ProjectForm
              action={updateProjectAction.bind(null, project.id)}
              defaults={project}
              submitLabel="Save changes"
            />
          </section>
        </>
      )}

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
                  <TableCell className="text-xs">
                    {a.user ? `${a.user.name}` : "System"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
