import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireView } from "@/lib/require-access";
import { canEdit } from "@/lib/rbac";
import {
  ELEMENT_LABEL,
  SCENE_INT_LABEL,
  SCENE_TIME_LABEL,
  formatEighths,
} from "@/lib/breakdown";
import { Button } from "@/components/ui/button";
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
import { ScriptUpload, AddSceneForm } from "./breakdown-forms";
import { seedBudgetFromBreakdownAction } from "./actions";
import type { ElementCategory } from "@/app/generated/prisma/client";

export default async function BreakdownPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireView("SCRIPT_BREAKDOWN");
  const editable = canEdit(session.user.role, "SCRIPT_BREAKDOWN");
  const canSeedBudget = canEdit(session.user.role, "PRODUCTION_BUDGET");

  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, title: true, code: true, currency: true, scriptFileUrl: true, scriptFileName: true },
  });
  if (!project) notFound();

  const scenes = await prisma.scene.findMany({
    where: { projectId: id },
    orderBy: { sortOrder: "asc" },
    include: { elements: { select: { estimatedCost: true, qty: true } } },
  });

  // Cost-by-category summary across all scenes.
  const elements = await prisma.breakdownElement.findMany({
    where: { scene: { projectId: id }, estimatedCost: { not: null } },
    select: { category: true, estimatedCost: true, qty: true },
  });
  const byCategory = new Map<ElementCategory, number>();
  for (const e of elements) {
    byCategory.set(
      e.category,
      (byCategory.get(e.category) ?? 0) + Number(e.estimatedCost) * e.qty,
    );
  }
  const grandTotal = [...byCategory.values()].reduce((s, n) => s + n, 0);
  const cur = project.currency;
  const money = (n: number) => `${cur} ${n.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href={`/projects/${id}`} className="text-sm text-muted-foreground hover:underline">
        ← {project.title}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">Script Breakdown</h1>
      <p className="font-mono text-sm text-muted-foreground">{project.code}</p>

      <Separator className="my-6" />

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Script</h2>
        {project.scriptFileUrl ? (
          <p className="mb-3 text-sm">
            Current:{" "}
            <a href={`/api/files/${project.scriptFileUrl}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {project.scriptFileName}
            </a>
          </p>
        ) : (
          <p className="mb-3 text-sm text-muted-foreground">No script uploaded.</p>
        )}
        {editable && <ScriptUpload projectId={id} />}
      </section>

      <Separator className="my-6" />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Scenes ({scenes.length})
          </h2>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Slugline</TableHead>
                <TableHead className="text-right">Pages</TableHead>
                <TableHead className="text-right">Elements</TableHead>
                <TableHead className="text-right">Est. cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scenes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No scenes yet.
                  </TableCell>
                </TableRow>
              ) : (
                scenes.map((s) => {
                  const est = s.elements.reduce(
                    (sum, e) => sum + Number(e.estimatedCost ?? 0) * e.qty,
                    0,
                  );
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono">
                        <Link href={`/projects/${id}/breakdown/${s.id}`} className="hover:underline">
                          {s.number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/projects/${id}/breakdown/${s.id}`} className="hover:underline">
                          {SCENE_INT_LABEL[s.intExt]}. {s.setName} — {SCENE_TIME_LABEL[s.time]}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatEighths(s.pageEighths)}</TableCell>
                      <TableCell className="text-right">{s.elements.length}</TableCell>
                      <TableCell className="text-right font-mono">{est ? money(est) : "—"}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {editable && (
          <div className="mt-4">
            <AddSceneForm projectId={id} />
          </div>
        )}
      </section>

      {byCategory.size > 0 && (
        <>
          <Separator className="my-6" />
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground">
                Estimated cost by category
              </h2>
              {canSeedBudget && (
                <form action={seedBudgetFromBreakdownAction.bind(null, id)}>
                  <Button type="submit" size="sm">Seed budget from breakdown</Button>
                </form>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {[...byCategory.entries()].map(([cat, amt]) => (
                <Badge key={cat} variant="secondary" className="font-mono">
                  {ELEMENT_LABEL[cat]}: {money(amt)}
                </Badge>
              ))}
            </div>
            <p className="mt-3 text-sm font-medium">Grand total: {money(grandTotal)}</p>
            {canSeedBudget && (
              <p className="mt-1 text-xs text-muted-foreground">
                Creates a new draft budget version with one line per category — then review
                and approve it in the Budget workspace.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
