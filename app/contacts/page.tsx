import { prisma } from "@/lib/prisma";
import { requireView } from "@/lib/require-access";
import { canEdit } from "@/lib/rbac";
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
import { AddContactForm } from "./add-contact-form";
import { deleteContactAction } from "./actions";

export default async function ContactsPage() {
  const session = await requireView("CREW");
  const editable = canEdit(session.user.role, "CREW");

  const [contacts, vendors] = await Promise.all([
    prisma.contact.findMany({
      orderBy: { name: "asc" },
      include: { vendor: { select: { vendorCode: true } } },
    }),
    editable
      ? prisma.vendor.findMany({
          where: { status: "ACTIVE" },
          orderBy: { legalName: "asc" },
          select: { id: true, vendorCode: true, legalName: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Crew &amp; Contacts</h1>
      <p className="text-sm text-muted-foreground">
        {contacts.length} {contacts.length === 1 ? "person" : "people"} · shared across projects
      </p>

      <Separator className="my-6" />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Vendor</TableHead>
              {editable && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={editable ? 6 : 5} className="text-center text-muted-foreground">
                  No contacts yet.
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.role ?? "—"}</TableCell>
                  <TableCell>{c.department ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {[c.email, c.phone].filter(Boolean).join(" · ") || "—"}
                  </TableCell>
                  <TableCell>
                    {c.vendor ? (
                      <Badge variant="secondary" className="font-mono">{c.vendor.vendorCode}</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  {editable && (
                    <TableCell className="text-right">
                      <form action={deleteContactAction.bind(null, c.id)}>
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
          <AddContactForm vendors={vendors} />
        </div>
      )}
    </div>
  );
}
