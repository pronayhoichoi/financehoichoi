/**
 * Government document verification (PAN via Income Tax portal, GSTIN via GST
 * portal) is a Phase 1 requirement (Sheet 2: "Automated Document
 * Verification") but needs API credentials and vendor contracts that are not
 * available yet.
 *
 * This is an intentional stub: it returns `verified: null` ("not verified")
 * rather than a fabricated pass, so the VRF review screen shows an honest
 * "not verified" state. Wire the real portals in here — nothing else in the
 * app calls a verification provider directly.
 */
export type VerificationResult = {
  verified: boolean | null;
  message: string;
};

export async function verifyPan(_pan: string): Promise<VerificationResult> {
  // TODO: wire to PAN verification API.
  return { verified: null, message: "PAN verification not configured" };
}

export async function verifyGstin(_gstin: string): Promise<VerificationResult> {
  // TODO: wire to GST portal API.
  return { verified: null, message: "GSTIN verification not configured" };
}
