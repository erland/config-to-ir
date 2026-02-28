import { Diagnostic } from "../engine/diagnostics";

export type RunSummary = {
  scannedRoot: string;
  fileCount: number;
  entityCount: number;
  relationCount: number;
  entitiesByType: Record<string, number>;
  relationsByKind: Record<string, number>;
  warningCount: number;
  errorCount: number;
  diagnosticsSample: Diagnostic[];
};

export function buildRunSummary(params: {
  scannedRoot: string;
  fileCount: number;
  entityCount: number;
  relationCount: number;
  entities: { type: string }[];
  relations: { kind: string }[];
  diagnostics: Diagnostic[];
  sampleLimit?: number;
}): RunSummary {
  const entitiesByType = params.entities.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] ?? 0) + 1;
    return acc;
  }, {});

  const relationsByKind = params.relations.reduce<Record<string, number>>((acc, r) => {
    acc[r.kind] = (acc[r.kind] ?? 0) + 1;
    return acc;
  }, {});

  const warningCount = params.diagnostics.filter((d) => d.severity === "warning").length;
  const errorCount = params.diagnostics.filter((d) => d.severity === "error").length;

  const diagnosticsSample = [...params.diagnostics]
    .slice(0, params.sampleLimit ?? 50);

  return {
    scannedRoot: params.scannedRoot,
    fileCount: params.fileCount,
    entityCount: params.entityCount,
    relationCount: params.relationCount,
    entitiesByType: Object.fromEntries(Object.entries(entitiesByType).sort(([a], [b]) => a.localeCompare(b))),
    relationsByKind: Object.fromEntries(Object.entries(relationsByKind).sort(([a], [b]) => a.localeCompare(b))),
    warningCount,
    errorCount,
    diagnosticsSample,
  };
}

export function formatHumanReport(summary: RunSummary): string {
  const lines: string[] = [];
  lines.push(`Scan root: ${summary.scannedRoot}`);
  lines.push(`Files: ${summary.fileCount}`);
  lines.push(`Entities: ${summary.entityCount}`);
  lines.push(`Relations: ${summary.relationCount}`);
  lines.push(`Warnings: ${summary.warningCount}`);
  lines.push(`Errors: ${summary.errorCount}`);
  lines.push("");

  lines.push("Entities by type:");
  for (const [k, v] of Object.entries(summary.entitiesByType)) {
    lines.push(`- ${k}: ${v}`);
  }
  lines.push("");

  lines.push("Relations by kind:");
  for (const [k, v] of Object.entries(summary.relationsByKind)) {
    lines.push(`- ${k}: ${v}`);
  }
  lines.push("");

  if (summary.diagnosticsSample.length) {
    lines.push(`Diagnostics (first ${summary.diagnosticsSample.length}):`);
    for (const d of summary.diagnosticsSample) {
      const where = d.filePath ? ` (${d.filePath})` : "";
      lines.push(`- [${d.severity}] ${d.message}${where}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
