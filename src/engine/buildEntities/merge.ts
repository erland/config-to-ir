import { FactEntity } from "../factGraph";
import { Diagnostic, warn } from "../diagnostics";

export type EntityMergePolicy = {
  tagMerge: "keep-first" | "overwrite";
  warnOnNameMismatch: boolean;
};

export function mergeEntityById(args: {
  byId: Map<string, FactEntity>;
  incoming: FactEntity;
  merge: EntityMergePolicy;
  diagnostics: Diagnostic[];
  filePath: string;
  entityType: string;
}): void {
  const { byId, incoming, merge, diagnostics, filePath, entityType } = args;
  const existing = byId.get(incoming.id);
  if (!existing) {
    byId.set(incoming.id, incoming);
    return;
  }

  // Merge
  if (merge.warnOnNameMismatch && existing.name !== incoming.name) {
    diagnostics.push(
      warn(`Entity id '${incoming.id}' has differing names ('${existing.name}' vs '${incoming.name}'). Keeping first.`, {
        entityId: incoming.id,
        entityType,
        filePath,
      }),
    );
  }

  // Merge tags
  for (const [k, v] of Object.entries(incoming.tags)) {
    if (existing.tags[k] === undefined) {
      existing.tags[k] = v;
    } else if (merge.tagMerge === "overwrite") {
      existing.tags[k] = v;
    }
  }

  // Merge evidence (dedupe)
  const seen = new Set(
    existing.evidence.map((ev) => `${ev.filePath}|${ev.line ?? ""}|${ev.key ?? ""}|${ev.extractor ?? ""}`),
  );
  for (const ev of incoming.evidence) {
    const key = `${ev.filePath}|${ev.line ?? ""}|${ev.key ?? ""}|${ev.extractor ?? ""}`;
    if (!seen.has(key)) {
      existing.evidence.push(ev);
      seen.add(key);
    }
  }
}
