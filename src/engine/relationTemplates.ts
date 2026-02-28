import { FactEntity } from "./factGraph";

/**
 * Renders relation templates using:
 * - ${from.id}, ${from.name}, ${from.type}
 * - ${from.tags.<key>}
 *
 * Missing values render as "".
 */
export function renderRelationTemplate(template: string, from: FactEntity): string {
  return template.replace(/\$\{from\.([A-Za-z0-9_]+)\}/g, (_m, key) => {
    const v = (from as any)[key];
    return v === undefined ? "" : String(v);
  }).replace(/\$\{from\.tags\.([A-Za-z0-9_]+)\}/g, (_m, key) => {
    const v = from.tags?.[key];
    return v === undefined ? "" : String(v);
  });
}
