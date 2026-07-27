"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  approveVrfAction,
  rejectVrfAction,
  requestEditsAction,
} from "../actions";

export function ReviewControls({
  submissionId,
  canApprove,
  canEdit,
  canBeApproved,
}: {
  submissionId: string;
  canApprove: boolean;
  canEdit: boolean;
  canBeApproved: boolean;
}) {
  const router = useRouter();
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  const [editState, editAction, editPending] = useActionState(
    requestEditsAction.bind(null, submissionId),
    undefined,
  );
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectVrfAction.bind(null, submissionId),
    undefined,
  );

  return (
    <div className="flex flex-col gap-6">
      {canApprove && (
        <div>
          <Button
            disabled={approving || !canBeApproved}
            onClick={async () => {
              setApproving(true);
              setApproveError(null);
              const res = await approveVrfAction(submissionId);
              setApproving(false);
              if (res.error) {
                setApproveError(res.error);
              } else if (res.vendorId) {
                router.push(`/vendors/${res.vendorId}`);
              }
            }}
          >
            {approving ? "Approving…" : "Approve & create vendor"}
          </Button>
          {!canBeApproved && (
            <p className="mt-2 text-xs text-muted-foreground">
              Vendor must submit the form before it can be approved.
            </p>
          )}
          {approveError && (
            <p className="mt-2 text-sm text-destructive">{approveError}</p>
          )}
        </div>
      )}

      {canEdit && (
        <form action={editAction} className="flex flex-col gap-2">
          <label className="text-sm font-medium">Request edits</label>
          <Textarea name="notes" rows={2} placeholder="What needs changing?" />
          <div>
            <Button type="submit" variant="outline" disabled={editPending}>
              {editPending ? "Sending…" : "Request edits"}
            </Button>
          </div>
          {editState?.error && (
            <p className="text-sm text-destructive">{editState.error}</p>
          )}
        </form>
      )}

      {canApprove && (
        <form action={rejectAction} className="flex flex-col gap-2">
          <label className="text-sm font-medium">Reject</label>
          <Textarea name="notes" rows={2} placeholder="Reason for rejection" />
          <div>
            <Button type="submit" variant="destructive" disabled={rejectPending}>
              {rejectPending ? "Rejecting…" : "Reject"}
            </Button>
          </div>
          {rejectState?.error && (
            <p className="text-sm text-destructive">{rejectState.error}</p>
          )}
        </form>
      )}
    </div>
  );
}
