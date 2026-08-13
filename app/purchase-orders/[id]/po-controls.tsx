"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { approvePoAction, cancelPoAction, submitPoAction } from "../actions";

export function PoControls({
  poId,
  status,
  canEdit,
  canApprove,
}: {
  poId: string;
  status: string;
  canEdit: boolean;
  canApprove: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [override, setOverride] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        {canEdit && status === "DRAFT" && (
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await submitPoAction(poId);
              setBusy(false);
              router.refresh();
            }}
          >
            Submit for approval
          </Button>
        )}

        {canApprove && status === "PENDING_APPROVAL" && (
          <>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={override} onCheckedChange={(v) => setOverride(v === true)} />
              Override budget
            </label>
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                const res = await approvePoAction(poId, override);
                setBusy(false);
                if (res?.error) setError(res.error);
                else router.refresh();
              }}
            >
              Approve PO
            </Button>
          </>
        )}

        {canEdit && status !== "CANCELLED" && status !== "CLOSED" && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await cancelPoAction(poId);
              setBusy(false);
              router.refresh();
            }}
          >
            Cancel PO
          </Button>
        )}
      </div>
    </div>
  );
}
