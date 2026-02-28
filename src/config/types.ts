import { z } from "zod";

/**
 * Minimal configuration schema for Steps 1-5.
 * Kept small and declarative; later steps can extend it.
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

export const ContextSchema = z
  .object({
    fromPath: z.array(PathContextRuleSchema).default([]),
  })
  .default({ fromPath: [] });

/**
 * Extraction primitives supported by Step 4 entity rule engine.
 */
export const RegexExtractSchema = z.object({
  type: z.literal("regex"),
  file: z.string().min(1), // glob relative to root
  pattern: z.string().min(1),
  flags: z.string().optional(),
  pickCaptures: z.array(z.string().min(1)).optional(),
});

export const PropertiesExtractSchema = z.object({
  type: z.literal("properties"),
  file: z.string().min(1),
  keys: z.array(z.string().min(1)).min(1),
  captureName: z.string().min(1).optional(),
  emitMissing: z.boolean().optional(),
});

export const YamlExtractSchema = z.object({
  type: z.literal("yaml"),
  file: z.string().min(1),
  selectPath: z.string().min(1).optional(),
  keys: z.array(z.string().min(1)).optional(),
  captureName: z.string().min(1).optional(),
  emitMissing: z.boolean().optional(),
});

export const EntityExtractSchema = z.discriminatedUnion("type", [
  RegexExtractSchema,
  PropertiesExtractSchema,
  YamlExtractSchema,
]);

export const MergePolicySchema = z
  .object({
    /**
     * How to merge tags when duplicates occur.
     * - "keep-first": keep existing tag value
     * - "overwrite": overwrite with new value
     */
    tagMerge: z.enum(["keep-first", "overwrite"]).default("keep-first"),
    /**
     * If true, differing names on the same ID produce a warning diagnostic.
     */
    warnOnNameMismatch: z.boolean().default(true),
  })
  .default({ tagMerge: "keep-first", warnOnNameMismatch: true });

export const EntityRuleSchema = z.object({
  /**
   * Domain-specific entity category (e.g., JBossDomain, JmsQueue, OracleSchema).
   */
  type: z.string().min(1),

  /**
   * Deterministic ID template. Supports ${ctx.<name>} and ${match.<capture>}.
   */
  idTemplate: z.string().min(1),

  /**
   * Name template. Defaults to ${match.name} if present, otherwise the id.
   */
  nameTemplate: z.string().optional(),

  /**
   * Optional classifier kind to carry forward into IR mapping later.
   */
  classifierKind: z.string().optional(),

  /**
   * Optional stereotype ID/name to carry forward into IR mapping later.
   */
  stereotypeId: z.string().optional(),

  /**
   * Optional tags (key -> template) to attach to the entity.
   */
  tags: z.record(z.string().min(1)).optional(),

  /**
   * One or more extraction rules.
   */
  extract: z.array(EntityExtractSchema).min(1),

  /**
   * Merge behavior when multiple discoveries generate same ID.
   */
  merge: MergePolicySchema.optional(),
});

/**
 * Step 5: relationship rules (fact-graph relations)
 */

export const RelationResolveSchema = z.discriminatedUnion("by", [
  z.object({
    by: z.literal("id"),
    template: z.string().min(1),
  }),
  z.object({
    by: z.literal("name"),
    template: z.string().min(1),
  }),
  z.object({
    by: z.literal("tag"),
    tagKey: z.string().min(1),
    template: z.string().min(1),
  }),
]);

export const RelationConstraintsSchema = z
  .object({
    /**
     * Require that the specified tags have equal values on both from/to entities.
     * Example: ["env","app"]
     */
    sameTags: z.array(z.string().min(1)).default([]),
  })
  .default({ sameTags: [] });

export const RelationRuleSchema = z.object({
  name: z.string().min(1),
  kind: z.string().min(1),
  stereotypeId: z.string().optional(),
  tags: z.record(z.string().min(1)).optional(),

  from: z.object({
    entityType: z.string().min(1),
  }),

  to: z.object({
    entityType: z.string().min(1),
    resolve: RelationResolveSchema,
  }),

  constraints: RelationConstraintsSchema.optional(),

  onUnresolved: z.enum(["ignore", "warn", "error"]).default("warn"),
  onAmbiguous: z.enum(["pick-first", "warn-pick-first", "error"]).default("warn-pick-first"),
});

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
export type EntityRule = z.infer<typeof EntityRuleSchema>;
export type EntityExtract = z.infer<typeof EntityExtractSchema>;
export type RelationRule = z.infer<typeof RelationRuleSchema>;
export type RelationResolve = z.infer<typeof RelationResolveSchema>;
