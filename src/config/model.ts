import { z } from "zod";

import {
  EntityExtractSchema,
  EntityRuleSchema,
  RelationResolveSchema,
  RelationRuleSchema,
  ToolConfigSchema,
} from "./schema";

// Inferred types (kept separate from schemas for readability and maintainability)
export type ToolConfig = z.infer<typeof ToolConfigSchema>;
export type EntityRule = z.infer<typeof EntityRuleSchema>;
export type EntityExtract = z.infer<typeof EntityExtractSchema>;
export type RelationRule = z.infer<typeof RelationRuleSchema>;
export type RelationResolve = z.infer<typeof RelationResolveSchema>;
