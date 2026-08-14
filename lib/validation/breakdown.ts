import { z } from "zod";
import { ELEMENT_CATEGORIES } from "@/lib/breakdown";

export const sceneFormSchema = z.object({
  number: z.string().trim().min(1, "Scene number required"),
  intExt: z.enum(["INT", "EXT", "INT_EXT"]),
  setName: z.string().trim().min(1, "Set / location required"),
  time: z.enum(["DAY", "NIGHT", "DAWN", "DUSK"]),
  pageEighths: z.number().int().nonnegative().optional(),
  synopsis: z.string().trim().optional().or(z.literal("")),
});

export const elementSchema = z.object({
  category: z.enum(ELEMENT_CATEGORIES as [string, ...string[]]),
  name: z.string().trim().min(1, "Name required"),
  qty: z.number().int().positive().default(1),
  notes: z.string().trim().optional().or(z.literal("")),
  estimatedCost: z.number().nonnegative().optional(),
});

export const elementsSchema = z.array(elementSchema);

export type SceneFormValues = z.infer<typeof sceneFormSchema>;
export type ElementInput = z.infer<typeof elementSchema>;
