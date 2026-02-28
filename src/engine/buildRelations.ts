import { FactEntity, FactRelation } from "./factGraph";
import { RelationRule, RelationResolve } from "../config/types";
import { Diagnostic, err, warn } from "./diagnostics";
import { renderRelationTemplate } from "./relationTemplates";
import { Evidence } from "../parse/types";

export type BuildRelationsResult = {
  relations: FactRelation[];
  diagnostics: Diagnostic[];
};

function matchesSameTags(from: FactEntity, to: FactEntity, keys: string[]): boolean {
  for (const k of keys) {
    const a = from.tags?.[k];
    const b = to.tags?.[k];
    if (a === undefined || b === undefined) return false;
    if (a !== b) return false;
  }
  return true;
}

function resolveCandidates(
  toEntities: FactEntity[],
  resolve: RelationResolve,
  from: FactEntity,
): FactEntity[] {
  const desired = renderRelationTemplate(resolve.template, from);

  switch (resolve.by) {
    case "id":
      return toEntities.filter((e) => e.id === desired);
    case "name":
      return toEntities.filter((e) => e.name === desired);
    case "tag":
      return toEntities.filter((e) => (e.tags?.[resolve.tagKey] ?? "") === desired);
    default:
      return [];
  }
}

function relationId(ruleName: string, fromId: string, toId: string): string {
  return `rel:${ruleName}:${fromId}->${toId}`;
}

function relationEvidence(ruleName: string, from: FactEntity, to: FactEntity): Evidence[] {
  const ev: Evidence[] = [];
  const fromEv = from.evidence?.[0];
  if (fromEv) {
    ev.push({ ...fromEv, extractor: "relation", key: ruleName });
  } else {
    ev.push({ filePath: "", extractor: "relation", key: ruleName });
  }
  // Optional: include target evidence too
  const toEv = to.evidence?.[0];
  if (toEv) {
    ev.push({ ...toEv, extractor: "relation-target", key: ruleName });
  }
  return ev;
}

/**
 * Builds relations using configured relation rules over an entity list.
 * Determinism:
 * - iterate rules in order
 * - iterate from entities sorted by id
 * - resolve ambiguity by choosing lexical smallest to.id
 */
export function buildRelations(entities: FactEntity[], rules: RelationRule[]): BuildRelationsResult {
  const diagnostics: Diagnostic[] = [];
  const relationsById = new Map<string, FactRelation>();

  const entitiesByType = new Map<string, FactEntity[]>();
  for (const e of entities) {
    const arr = entitiesByType.get(e.type) ?? [];
    arr.push(e);
    entitiesByType.set(e.type, arr);
  }
  for (const arr of entitiesByType.values()) {
    arr.sort((a, b) => a.id.localeCompare(b.id));
  }

  const fromEntitiesSorted = [...entities].sort((a, b) => a.id.localeCompare(b.id));

  for (const rule of rules) {
    const fromType = rule.from.entityType;
    const toType = rule.to.entityType;
    const sameTags = rule.constraints?.sameTags ?? [];

    const toEntitiesAll = entitiesByType.get(toType) ?? [];

    for (const from of fromEntitiesSorted) {
      if (from.type !== fromType) continue;

      const toFiltered = sameTags.length
        ? toEntitiesAll.filter((t) => matchesSameTags(from, t, sameTags))
        : toEntitiesAll;

      const candidates = resolveCandidates(toFiltered, rule.to.resolve, from);

      if (candidates.length === 0) {
        const msg = `Relation '${rule.name}' could not resolve target for from='${from.id}' (toType='${toType}').`;
        if (rule.onUnresolved === "warn") {
          diagnostics.push(warn(msg, { entityId: from.id, entityType: from.type, ruleType: "relation" }));
        } else if (rule.onUnresolved === "error") {
          diagnostics.push(err(msg, { entityId: from.id, entityType: from.type, ruleType: "relation" }));
        }
        continue;
      }

      let chosen: FactEntity | undefined;
      if (candidates.length === 1) {
        chosen = candidates[0];
      } else {
        const sorted = [...candidates].sort((a, b) => a.id.localeCompare(b.id));
        chosen = sorted[0];
        const msg = `Relation '${rule.name}' has ${candidates.length} targets for from='${from.id}'. Picked '${chosen.id}'.`;
        if (rule.onAmbiguous === "warn-pick-first") {
          diagnostics.push(warn(msg, { entityId: from.id, entityType: from.type, ruleType: "relation" }));
        } else if (rule.onAmbiguous === "error") {
          diagnostics.push(err(msg, { entityId: from.id, entityType: from.type, ruleType: "relation" }));
          continue;
        }
        // pick-first: silent
      }

      const relId = relationId(rule.name, from.id, chosen.id);

      const tags: Record<string, string> = {};
      for (const [k, templ] of Object.entries(rule.tags ?? {})) {
        tags[k] = renderRelationTemplate(templ, from);
      }

      if (!relationsById.has(relId)) {
        relationsById.set(relId, {
          id: relId,
          kind: rule.kind,
          fromId: from.id,
          toId: chosen.id,
          stereotypeId: rule.stereotypeId,
          tags,
          evidence: relationEvidence(rule.name, from, chosen),
        });
      }
    }
  }

  const relations = [...relationsById.values()].sort((a, b) => a.id.localeCompare(b.id));
  return { relations, diagnostics };
}
