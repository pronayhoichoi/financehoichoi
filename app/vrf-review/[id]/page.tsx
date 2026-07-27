import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireView } from "@/lib/require-access";
import { canApprove as canApproveModule, canEdit as canEditModule } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ReviewControls } from "./review-controls";
import type { VrfStatus } from "@/app/generated/prisma/client";

const STATUS_VARIANT: Record<
  VrfStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "secondary",
  EDITS_REQUESTED: "outline",
  APPROVED: "default",
  REJECTED: "destructive",
};

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value || "—"}</dd>
    </>
  );
}

export default async function VrfReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireView("VRF");
  const role = session.user.role;
  const canApprove = canApproveModule(role, "VRF");
  const canEdit = canEditModule(role, "VRF");

  const submission = await prisma.vrfSubmission.findUnique({
    where: { id },
    include: { documents: true, vendor: true },
  });
  if (!submission) notFound();

  const data = (submission.formData ?? {}) as Record<string, unknown>;
  const verification = data._verification as
    | { pan?: { verified: boolean | null; message: string } }
    | undefined;
  const str = (k: string) => (data[k] as string | undefined) ?? undefined;
  const gstin = (data.gstin as string[] | undefined) ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/vrf-review" className="text-sm text-muted-foreground hover:underline">
        ← VRF Review
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {str("legalName") ?? submission.invitedEmail ?? "VRF submission"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Invited: {submission.invitedEmail ?? "(open link)"}
          </p>
        </div>
        <Badge variant={STATUS_VARIANT[submission.status]}>{submission.status}</Badge>
      </div>

      {submission.reviewerNotes && (
        <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm dark:bg-amber-950/30">
          <span className="font-medium">Reviewer notes: </span>
          {submission.reviewerNotes}
        </div>
      )}

      {submission.status === "APPROVED" && submission.vendor && (
        <div className="mt-4 rounded-md border bg-muted px-4 py-3 text-sm">
          Approved → vendor{" "}
          <Link href={`/vendors/${submission.vendor.id}`} className="font-mono hover:underline">
            {submission.vendor.vendorCode}
          </Link>
        </div>
      )}

      <Separator className="my-6" />

      {!submission.submittedAt ? (
        <p className="text-sm text-muted-foreground">
          The vendor has not submitted this form yet.
        </p>
      ) : (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
            Submitted details
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Row label="Legal name" value={str("legalName")} />
            <Row label="Trade name" value={str("tradeName")} />
            <Row label="PAN" value={str("pan")} />
            <Row label="GSTIN" value={gstin.join(", ")} />
            <Row label="Category" value={str("category")} />
            <Row label="TDS section" value={str("tdsSection")} />
            <Row label="Bank account" value={str("bankAccountNo")} />
            <Row label="Bank" value={str("bankName")} />
            <Row label="IFSC" value={str("ifsc")} />
            <Row label="Beneficiary" value={str("beneficiaryName")} />
          </dl>

          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">PAN verification:</span>
            <Badge variant="outline">
              {verification?.pan?.verified === null || verification?.pan?.verified === undefined
                ? "Not verified"
                : verification.pan.verified
                  ? "Verified"
                  : "Failed"}
            </Badge>
          </div>

          <h3 className="mt-6 mb-2 text-sm font-semibold text-muted-foreground">
            Documents
          </h3>
          {submission.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents uploaded.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {submission.documents.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                  <Badge variant="secondary">{d.type}</Badge>
                  <a
                    href={`/api/files/${d.fileUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {d.fileName}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {(canApprove || canEdit) &&
        submission.status !== "APPROVED" &&
        submission.status !== "REJECTED" && (
          <>
            <Separator className="my-6" />
            <ReviewControls
              submissionId={submission.id}
              canApprove={canApprove}
              canEdit={canEdit}
              canBeApproved={Boolean(submission.submittedAt)}
            />
          </>
        )}
    </div>
  );
}
