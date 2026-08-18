import { z } from "zod";
import { captureSources, workplaceTypes } from "./opportunity";

const optionalText = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((value) => value || undefined);

export const createOpportunityInput = z.object({
  title: z.string().trim().min(1).max(200),
  companyName: z.string().trim().min(1).max(200),
  location: optionalText,
  sourceUrl: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((value) => value || undefined),
  workplaceType: z.enum(workplaceTypes).optional(),
  compensation: optionalText,
  notes: z
    .string()
    .trim()
    .max(20_000)
    .optional()
    .transform((value) => value || undefined),
  intent: z.enum(["SAVE", "APPLY"]).default("SAVE"),
  captureSource: z.enum(captureSources).default("web"),
});

export const updateOpportunityInput = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  companyName: z.string().trim().min(1).max(200).optional(),
  location: z.string().trim().max(200).nullable().optional(),
  sourceUrl: z.string().trim().max(2000).nullable().optional(),
  workplaceType: z.enum(workplaceTypes).optional(),
  compensation: z.string().trim().max(200).nullable().optional(),
  descriptionText: z.string().trim().max(50_000).nullable().optional(),
});

export const createNoteInput = z.object({
  body: z.string().trim().min(1).max(20_000),
});

export type CreateOpportunityInput = z.infer<typeof createOpportunityInput>;
export type UpdateOpportunityInput = z.infer<typeof updateOpportunityInput>;
export type CreateNoteInput = z.infer<typeof createNoteInput>;
