import { z } from "zod";

export const PROJECT_TYPES = ["FILM", "SERIES", "SHORT", "OTHER"] as const;
export const PROJECT_STATUSES = [
  "PRE_PRODUCTION",
  "PRODUCTION",
  "POST",
  "RELEASED",
  "ARCHIVED",
] as const;

const optionalDate = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : undefined));

export const projectFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  type: z.enum(PROJECT_TYPES),
  genre: z.string().trim().optional().or(z.literal("")),
  status: z.enum(PROJECT_STATUSES),
  startDate: optionalDate,
  endDate: optionalDate,
  businessUnit: z.string().trim().optional().or(z.literal("")),
  producer: z.string().trim().optional().or(z.literal("")),
  currency: z.string().trim().min(1).default("INR"),
  commissioned: z.boolean().default(false),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
