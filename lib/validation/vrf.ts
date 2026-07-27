import { z } from "zod";
import { vendorFormSchema } from "./vendor";

// The public VRF captures the same fields as the Vendor Master, plus a
// declaration the vendor must accept before submitting.
export const vrfSubmitSchema = vendorFormSchema.extend({
  declaration: z.literal(true, {
    message: "You must confirm the declaration to submit.",
  }),
});

export type VrfSubmitValues = z.infer<typeof vrfSubmitSchema>;

// Documents the VRF invites the vendor to upload (Sheet 5, Flow 1).
export const VRF_DOC_SLOTS = [
  { key: "PAN", label: "PAN card", required: true },
  { key: "GST", label: "GST certificate", required: false },
  { key: "CANCELLED_CHEQUE", label: "Cancelled cheque", required: true },
  { key: "AGREEMENT", label: "Agreement", required: false },
] as const;
