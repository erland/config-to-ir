import path from "node:path";
import { FactEntity, FactRelation } from "../engine/factGraph";

export type IrTaggedValue = { key: string; value: string };
export type IrSourceRef = { file: string; line?: number | null; col?: number | null };

export type IrClassifier = {
  id: string;
  name: string;
  kind: string;
  qualifiedName?: string;
  packageId?: string;
  visibility?: string;
  attributes?: any[];
  operations?: any[];
  taggedValues?: IrTaggedValue[];
  source?: IrSourceRef;
  stereotypeRefs?: { stereotypeId: string; values?: Record<string, any> }[];
};

export type IrRelation = {
  id: string;
  kind: string;
  sourceId: string;
  targetId: string;
  name?: string;
  taggedValues?: IrTaggedValue[];
  source?: IrSourceRef;
  stereotypeRefs?: { stereotypeId: string; values?: Record<string, any> }[];
};

export type IrV2 = {
  schemaVersion: string;
  packages?: any[];
  classifiers: IrClassifier[];
  relations?: IrRelation[];
  taggedValues?: IrTaggedValue[];
  stereotypeDefinitions?: any[];
};

const ALLOWED_CLASSIFIER_KINDS = new Set([
  "CLASS",
  "INTERFACE",
  "ENUM",
  "RECORD",
  "TYPE_ALIAS",
  "FUNCTION",
  "COMPONENT",
  "SERVICE",
  "MODULE",
]);

const ALLOWED_RELATION_KINDS = new Set([
  "GENERALIZATION",
  "REALIZATION",
  "ASSOCIATION",
  "DEPENDENCY",
  "COMPOSITION",
  "AGGREGATION",
  "RENDER",
  "DI",
  "TEMPLATE_USES",
  "ROUTE_TO",
]);

function toTaggedValues(tags: Record<string, string> | undefined): IrTaggedValue[] | undefined {
  const entries = Object.entries(tags ?? {})
    .filter(([k]) => k && k.length > 0)
    .map(([k, v]) => ({ key: k, value: String(v ?? "") }))
    .sort((a, b) => a.key.localeCompare(b.key));
  return entries.length ? entries : undefined;
}

function toSourceRefFromEvidence(evidence: { filePath: string; line?: number }[] | undefined): IrSourceRef | undefined {
  const ev = evidence && evidence.length ? evidence[0] : undefined;
  if (!ev) return undefined;
  // Use file path as-is, but normalize separators for determinism
  const norm = ev.filePath.split(path.sep).join(path.posix.sep);
  return {
    file: norm,
    line: ev.line ?? undefined,
  };
}

function normalizeClassifierKind(kind: string | undefined): string {
  if (!kind) return "CLASS";
  const k = kind.toUpperCase();
  return ALLOWED_CLASSIFIER_KINDS.has(k) ? k : "CLASS";
}

function normalizeRelationKind(kind: string | undefined): string {
  if (!kind) return "DEPENDENCY";
  const k = kind.toUpperCase();
  return ALLOWED_RELATION_KINDS.has(k) ? k : "DEPENDENCY";
}

export function mapFactGraphToIrV2(params: {
  entities: FactEntity[];
  relations: FactRelation[];
}): IrV2 {
  const classifiers: IrClassifier[] = params.entities
    .map((e) => ({
      id: e.id,
      name: e.name,
      kind: normalizeClassifierKind(e.classifierKind),
      taggedValues: toTaggedValues(e.tags),
      source: toSourceRefFromEvidence(e.evidence),
      stereotypeRefs: e.stereotypeId ? [{ stereotypeId: e.stereotypeId }] : undefined,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const rels: IrRelation[] = params.relations
    .map((r) => ({
      id: r.id,
      kind: normalizeRelationKind(r.kind),
      sourceId: r.fromId,
      targetId: r.toId,
      taggedValues: toTaggedValues(r.tags),
      source: toSourceRefFromEvidence(r.evidence),
      stereotypeRefs: r.stereotypeId ? [{ stereotypeId: r.stereotypeId }] : undefined,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const ir: IrV2 = {
    schemaVersion: "IR_V2",
    classifiers,
    relations: rels.length ? rels : undefined,
  };

  return ir;
}
