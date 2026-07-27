import { z } from "zod";

export const VENDOR_CATEGORIES = [
  "Talent",
  "Technical",
  "Services",
  "Utilities",
  "Other",
] as const;

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

// Mirrors the Vendor Master fields from Sheet 3 — shared by the manual
// create/edit form and the public VRF form so both validate identically.
export const vendorFormSchema = z.object({
  legalName: z.string().trim().min(1, "Legal name is required"),
  tradeName: z.string().trim().optional().or(z.literal("")),
  pan: z
    .string()
    .trim()
    .toUpperCase()
    .regex(PAN_REGEX, "PAN must look like ABCDE1234F"),
  gstin: z
    .array(
      z.string().trim().toUpperCase().regex(GSTIN_REGEX, "Invalid GSTIN"),
    )
    .default([]),
  placeOfSupply: z.string().trim().optional().or(z.literal("")),
  placeOfInvoice: z.string().trim().optional().or(z.literal("")),
  msmeStatus: z.boolean().default(false),

  addressLine: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  state: z.string().trim().optional().or(z.literal("")),
  pincode: z.string().trim().optional().or(z.literal("")),

  bankAccountNo: z.string().trim().min(4, "Bank account number is required"),
  bankName: z.string().trim().min(1, "Bank name is required"),
  ifsc: z
    .string()
    .trim()
    .toUpperCase()
    .regex(IFSC_REGEX, "IFSC must look like ABCD0123456"),
  beneficiaryName: z.string().trim().min(1, "Beneficiary name is required"),

  category: z.enum(VENDOR_CATEGORIES),
  paymentTerms: z.string().trim().optional().or(z.literal("")),
  tdsSection: z.string().trim().optional().or(z.literal("")),
  lowerTdsFlag: z.boolean().default(false),
  defaultLedger: z.string().trim().optional().or(z.literal("")),
});

export type VendorFormValues = z.infer<typeof vendorFormSchema>;
