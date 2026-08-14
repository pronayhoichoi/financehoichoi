import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireView } from "@/lib/require-access";
import { canEdit } from "@/lib/rbac";
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
import { AddLocationForm } from "./add-location-form";
import { deleteLocationAction } from "./actions";

export default async function LocationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireView("LOCATIONS");
  const editable = canEdit(session.user.role, "LOCATIONS");

  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, title: true, code: true, currency: true },
  });
  if (!project) notFound();

  const locations = await prisma.location.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href={`/projects/${id}`} className="text-sm text-muted-foreground hover:underline">
        ← {project.title}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">Locations</h1>
      <p className="font-mono text-sm text-muted-foreground">{project.code}</p>

      <Separator className="my-6" />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Day cost</TableHead>
              {editable && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={editable ? 5 : 4} className="text-center text-muted-foreground">
                  No locations yet.
                </TableCell>
              </TableRow>
            ) : (
              locations.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{l.address ?? "—"}</TableCell>
                  <TableCell className="text-sm">
                    {l.contactName ?? "—"}
                    {l.contactPhone ? ` · ${l.contactPhone}` : ""}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {l.dayCost != null
                      ? `${project.currency} ${Number(l.dayCost).toLocaleString("en-IN")}`
                      : "—"}
                  </TableCell>
                  {editable && (
                    <TableCell className="text-right">
                      <form action={deleteLocationAction.bind(null, l.id)}>
                        <Button type="submit" variant="ghost" size="sm">✕</Button>
                      </form>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {editable && (
        <div className="mt-4">
          <AddLocationForm projectId={id} />
        </div>
      )}
    </div>
  );
}
