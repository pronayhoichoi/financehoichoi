import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireView } from "@/lib/require-access";
import {
  canEdit as canEditModule,
  canSeeUnmaskedBankDetails,
  maskAccountNumber,
} from "@/lib/rbac";
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
import { updateVendorAction } from "../actions";
import { VendorForm } from "../vendor-form";
import { StatusControl, DocumentUpload } from "./vendor-detail-controls";

// Kept out of the component body so the render stays pure (no Date.now in render).
function isExpired(date: Date | null): boolean {
  return date ? date.getTime() < Date.now() : false;
}

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireView("VENDOR_MASTER");
  const role = session.user.role;
  const canEdit = canEditModule(role, "VENDOR_MASTER");
  const unmasked = canSeeUnmaskedBankDetails(role);

  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: {
      documents: { orderBy: { uploadedAt: "desc" } },
    },
  });
  if (!vendor) notFound();

  const audits = await prisma.auditLog.findMany({
    where: { entityType: "Vendor", entityId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/vendors" className="text-sm text-muted-foreground hover:underline">
        ← Vendors
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{vendor.legalName}</h1>
          <p className="font-mono text-sm text-muted-foreground">
            {vendor.vendorCode}
          </p>
        </div>
        <StatusControl vendorId={vendor.id} current={vendor.status} canEdit={canEdit} />
      </div>

      <Separator className="my-6" />

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          Bank details
        </h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Account number</dt>
          <dd className="font-mono">
            {unmasked
              ? vendor.bankAccountNo
              : maskAccountNumber(vendor.bankAccountNo)}
            {!unmasked && (
              <span className="ml-2 text-xs text-muted-foreground">(masked)</span>
            )}
          </dd>
          <dt className="text-muted-foreground">Bank</dt>
          <dd>{vendor.bankName}</dd>
          <dt className="text-muted-foreground">IFSC</dt>
          <dd className="font-mono">{vendor.ifsc}</dd>
          <dt className="text-muted-foreground">Beneficiary</dt>
          <dd>{vendor.beneficiaryName}</dd>
        </dl>
      </section>

      <Separator className="my-6" />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">Documents</h2>
        </div>
        {canEdit && (
          <div className="mb-4 rounded-md border p-4">
            <DocumentUpload vendorId={vendor.id} />
          </div>
        )}
        {vendor.documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents uploaded.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {vendor.documents.map((doc) => {
              const expired = isExpired(doc.expiryDate);
              return (
                <li
                  key={doc.id}
                  className="flex items-center justify-between px-4 py-2 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{doc.type}</Badge>
                    <a
                      href={`/api/files/${doc.fileUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {doc.fileName}
                    </a>
                  </div>
                  {doc.expiryDate && (
                    <Badge variant={expired ? "destructive" : "outline"}>
                      {expired ? "Expired " : "Expires "}
                      {format(doc.expiryDate, "dd MMM yyyy")}
                    </Badge>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Separator className="my-6" />

      {canEdit && (
        <>
          <section>
            <h2 className="mb-4 text-sm font-semibold text-muted-foreground">
              Edit details
            </h2>
            <VendorForm
              action={updateVendorAction.bind(null, vendor.id)}
              defaults={vendor}
              submitLabel="Save changes"
            />
          </section>
          <Separator className="my-6" />
        </>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          Audit trail
        </h2>
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
                    {a.user ? `${a.user.name} (${a.user.email})` : "System"}
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
