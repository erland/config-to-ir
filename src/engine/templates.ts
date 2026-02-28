export type TemplateContext = {
  ctx: Record<string, string>;
  match: Record<string, string>;
};

/**
 * Renders ${ctx.key} and ${match.key} placeholders.
 * Missing values render as "".
 */
export function renderTemplate(template: string, data: TemplateContext): string {
  return template.replace(/\$\{(ctx|match)\.([A-Za-z0-9_]+)\}/g, (_m, scope, key) => {
    const src = scope === "ctx" ? data.ctx : data.match;
    const v = src[key];
    return v === undefined ? "" : String(v);
  });
}

export type ValueTransform =
  | { op: "trim" }
  | { op: "lower" }
  | { op: "upper" }
  | { op: "replace"; from: string; to: string }
  | { op: "regexReplace"; pattern: string; replace: string; flags?: string };

export function applyTransforms(value: string, transforms: ValueTransform[] | undefined): string {
  let v = value;
  for (const t of transforms ?? []) {
    switch (t.op) {
      case "trim":
        v = v.trim();
        break;
      case "lower":
        v = v.toLowerCase();
        break;
      case "upper":
        v = v.toUpperCase();
        break;
      case "replace":
        v = v.split(t.from).join(t.to);
        break;
      case "regexReplace": {
        const re = new RegExp(t.pattern, t.flags);
        v = v.replace(re, t.replace);
        break;
      }
      default:
        // exhaustive
        break;
    }
  }
  return v;
}
