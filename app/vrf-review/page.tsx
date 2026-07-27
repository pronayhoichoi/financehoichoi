import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireView } from "@/lib/require-access";
import { canEdit } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InviteForm } from "./invite-form";
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

export default async function VrfReviewPage() {
  const session = await requireView("VRF");
  const canInvite = canEdit(session.user.role, "VRF");

  const submissions = await prisma.vrfSubmission.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold">VRF Review</h1>
      <p className="text-sm text-muted-foreground">
        Vendor registration submissions.
      </p>

      {canInvite && (
        <div className="mt-6">
          <InviteForm />
        </div>
      )}

      <div className="mt-6 rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invited email</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No submissions yet.
                </TableCell>
              </TableRow>
            ) : (
              submissions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Link href={`/vrf-review/${s.id}`} className="hover:underline">
                      {s.invitedEmail ?? "(open link)"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {s.submittedAt
                      ? formatDistanceToNow(s.submittedAt, { addSuffix: true })
                      : "Not yet"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[s.status]}>{s.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDistanceToNow(s.updatedAt, { addSuffix: true })}
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
