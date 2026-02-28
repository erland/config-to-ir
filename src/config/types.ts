import { z } from "zod";

/**
 * Minimal, Step-1-level configuration schema.
 * Intentionally permissive: later steps will tighten and extend this.
 */
export const PathContextRuleSchema = z.object({
  name: z.string().min(1),
  regex: z.string().min(1),
});

export const InputsSchema = z.object({
  root: z.string().min(1).default("."),
  include: z.array(z.string().min(1)).min(1),
  exclude: z.array(z.string().min(1)).default([]),
});

export const ContextSchema = z.object({
  fromPath: z.array(PathContextRuleSchema).default([]),
}).default({ fromPath: [] });

// Placeholders for Step 1. Later steps will define these in detail.
export const EntityRuleSchema = z.any();
export const RelationRuleSchema = z.any();

export const ToolConfigSchema = z.object({
  version: z.number().int().positive(),
  inputs: InputsSchema,
  context: ContextSchema.optional(),
  entities: z.array(EntityRuleSchema).default([]),
  relations: z.array(RelationRuleSchema).default([]),
  packages: z.any().optional(),
  diagnostics: z.any().optional(),
});

export type ToolConfig = z.infer<typeof ToolConfigSchema>;
