import { prisma } from "@/lib/prisma";
import { VrfPublicForm } from "./vrf-public-form";

export default async function VrfPublicPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const submission = await prisma.vrfSubmission.findUnique({
    where: { token },
    select: { status: true, reviewerNotes: true },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Vendor Registration — hoichoi</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Please provide your business, bank, and tax details and upload the
        required documents.
      </p>

      <div className="mt-8">
        {!submission ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            This registration link is invalid.
          </div>
        ) : submission.status === "APPROVED" ? (
          <div className="rounded-md border bg-muted px-4 py-3 text-sm">
            This registration has already been approved.
          </div>
        ) : submission.status === "REJECTED" ? (
          <div className="rounded-md border bg-muted px-4 py-3 text-sm">
            This registration has been closed. Please contact finance.
          </div>
        ) : (
          <>
            {submission.status === "EDITS_REQUESTED" && submission.reviewerNotes && (
              <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm dark:bg-amber-950/30">
                <span className="font-medium">Finance requested changes: </span>
                {submission.reviewerNotes}
              </div>
            )}
            <VrfPublicForm token={token} />
          </>
        )}
      </div>
    </div>
  );
}
