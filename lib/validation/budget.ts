import { z } from "zod";

export const budgetLineSchema = z.object({
  department: z.string().trim().min(1, "Department required"),
  category: z.string().trim().min(1, "Category required"),
  ledger: z.string().trim().optional().or(z.literal("")),
  description: z.string().trim().min(1, "Description required"),
  approvedAmount: z
    .number({ message: "Amount required" })
    .nonnegative("Amount must be ≥ 0"),
});

export const budgetLinesSchema = z
  .array(budgetLineSchema)
  .min(1, "Add at least one budget line");

export type BudgetLineInput = z.infer<typeof budgetLineSchema>;
