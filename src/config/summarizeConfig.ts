import { ToolConfig } from "./types";

export function summarizeConfig(cfg: ToolConfig): string {
  const lines: string[] = [];
  lines.push(`version: ${cfg.version}`);
  lines.push(`inputs.root: ${cfg.inputs.root}`);
  lines.push(`inputs.include: ${cfg.inputs.include.length} pattern(s)`);
  lines.push(`inputs.exclude: ${cfg.inputs.exclude.length} pattern(s)`);
  lines.push(`context.fromPath: ${(cfg.context?.fromPath?.length ?? 0)} rule(s)`);
  lines.push(`entities: ${cfg.entities.length} rule(s)`);
  lines.push(`relations: ${cfg.relations.length} rule(s)`);
  return lines.join("\n");
}
