import { z } from "zod";

export const poLineSchema = z.object({
  budgetLineId: z.string().trim().optional().or(z.literal("")),
  description: z.string().trim().min(1, "Description required"),
  qty: z.number({ message: "Qty required" }).positive("Qty must be > 0"),
  rate: z.number({ message: "Rate required" }).nonnegative("Rate must be ≥ 0"),
  taxPct: z.number().nonnegative().max(100).optional(),
});

export const poFormSchema = z.object({
  projectId: z.string().trim().min(1, "Project required"),
  vendorId: z.string().trim().min(1, "Vendor required"),
  deliveryDate: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
  lines: z.array(poLineSchema).min(1, "Add at least one line"),
});

export type PoLineInput = z.infer<typeof poLineSchema>;
export type PoFormValues = z.infer<typeof poFormSchema>;

export function lineAmount(qty: number, rate: number): number {
  return Math.round(qty * rate * 100) / 100;
}
