import { z } from "zod";
import { captureSources, workplaceTypes } from "./opportunity";

const optionalText = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((value) => value || undefined);

export const createOpportunityInput = z
  .object({
    title: optionalText,
    companyName: optionalText,
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
    autoEnrich: z.boolean().optional(),
  })
  .superRefine((value, context) => {
    if (!value.sourceUrl && (!value.title || !value.companyName)) {
      context.addIssue({
        code: "custom",
        message: "Enter a job URL or both company and title.",
        path: ["sourceUrl"],
      });
    }
  });

export const updateOpportunityInput = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  companyName: z.string().trim().min(1).max(200).optional(),
  companyLogoUrl: z.string().trim().max(2000).nullable().optional(),
  location: z.string().trim().max(200).nullable().optional(),
  sourceUrl: z.string().trim().max(2000).nullable().optional(),
  workplaceType: z.enum(workplaceTypes).optional(),
  compensation: z.string().trim().max(200).nullable().optional(),
  descriptionText: z.string().trim().max(50_000).nullable().optional(),
});

export const createNoteInput = z.object({
  body: z.string().trim().min(1).max(20_000),
});

export const moveStageInput = z.object({
  stageId: z.string().trim().min(1),
});

export const createTaskInput = z.object({
  title: z.string().trim().min(1).max(200),
  dueAt: z.string().datetime().nullable().optional(),
});

export const updateTaskInput = z.object({
  completed: z.boolean(),
});

export const createInterviewInput = z.object({
  scheduledAt: z.string().datetime(),
  type: z.string().trim().min(1).max(80).default("interview"),
  round: z.string().trim().max(80).optional(),
  interviewer: z.string().trim().max(200).optional(),
  meetingUrl: z.string().trim().url().max(2000).optional(),
  notes: z.string().trim().max(5000).optional(),
});

export const stageSettingsInput = z.object({
  stages: z
    .array(
      z.object({
        id: z.string().trim().min(1).optional(),
        name: z.string().trim().min(1).max(80),
        orderIndex: z.number().int().min(0),
        hidden: z.boolean(),
      }),
    )
    .min(1),
});

export type CreateOpportunityInput = z.infer<typeof createOpportunityInput>;
export type UpdateOpportunityInput = z.infer<typeof updateOpportunityInput>;
export type CreateNoteInput = z.infer<typeof createNoteInput>;
export type MoveStageInput = z.infer<typeof moveStageInput>;
export type CreateTaskInput = z.infer<typeof createTaskInput>;
export type UpdateTaskInput = z.infer<typeof updateTaskInput>;
export type CreateInterviewInput = z.infer<typeof createInterviewInput>;
export type StageSettingsInput = z.infer<typeof stageSettingsInput>;
