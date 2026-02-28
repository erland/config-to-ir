export type PathContextRule = {
  name: string;
  regex: string;
};

export type PathContext = Record<string, string>;

export type ApplyPathContextOptions = {
  /**
   * If true, later rules overwrite earlier values for the same context key.
   * Default: true
   */
  allowOverride?: boolean;
};

/**
 * Applies configured regex rules to a relative path and returns a context object.
 * Each rule may capture values either via:
 * - named groups (preferred): (?<env>prod)
 * - first capturing group (fallback)
 *
 * If named groups exist, the tool will:
 * - use a named group that matches the rule name if present
 * - otherwise use the first named group
 */
export function extractContextFromPath(
  relPath: string,
  rules: PathContextRule[],
  opts: ApplyPathContextOptions = {},
): PathContext {
  const allowOverride = opts.allowOverride ?? true;
  const ctx: PathContext = {};

  for (const rule of rules) {
    let re: RegExp;
    try {
      re = new RegExp(rule.regex);
    } catch (e: any) {
      // Invalid regex should be handled as config validation later; here we fail fast.
      throw new Error(`Invalid context regex for '${rule.name}': ${rule.regex}. ${e?.message ?? e}`);
    }

    const candidates = [relPath, `/${relPath}`, `/${relPath}/`];

let m: RegExpExecArray | null = null;
for (const c of candidates) {
  re.lastIndex = 0;
      m = re.exec(c);
  if (m) break;
}

if (!m) continue;

    const groups = (m as any).groups as Record<string, string> | undefined;

    let value: string | undefined;
    if (groups && Object.keys(groups).length > 0) {
      // Prefer group matching the configured name
      value = groups[rule.name];
      if (value === undefined) {
        // Otherwise take the first named group
        const firstKey = Object.keys(groups)[0];
        value = groups[firstKey];
      }
    } else if (m.length >= 2) {
      // Fallback to first capturing group
      value = m[1];
    }

    if (value === undefined) continue;

    if (ctx[rule.name] === undefined || allowOverride) {
      ctx[rule.name] = value;
    }
  }

  return ctx;
}
