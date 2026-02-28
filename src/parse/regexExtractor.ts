import { ExtractionMatch } from "./types";

export type RegexExtractorOptions = {
  filePath: string;
  content: string;
  /**
   * JavaScript regex pattern string. You may include flags in a separate field.
   */
  pattern: string;
  flags?: string;
  /**
   * If provided, only these capture keys will be included in captures.
   */
  pickCaptures?: string[];
  /**
   * If true (default), include unnamed numeric captures as "1","2",...
   */
  includeNumericCaptures?: boolean;
};

export function extractWithRegex(opts: RegexExtractorOptions): ExtractionMatch[] {
  const includeNumeric = opts.includeNumericCaptures ?? true;

  let re: RegExp;
  try {
    re = new RegExp(opts.pattern, opts.flags ?? "g");
  } catch (e: any) {
    throw new Error(`Invalid regex pattern: ${opts.pattern}. ${e?.message ?? e}`);
  }

  // Ensure global iteration for multi-match support
  if (!re.global) {
    // create equivalent global regex
    re = new RegExp(re.source, (re.flags + "g").replace(/gg+/g, "g"));
  }

  const matches: ExtractionMatch[] = [];
  let m: RegExpExecArray | null;
  while (true) {
    m = re.exec(opts.content);
    if (!m) break;

    const captures: Record<string, string> = {};

    const groups = (m as any).groups as Record<string, string> | undefined;
    if (groups) {
      for (const [k, v] of Object.entries(groups)) {
        if (v === undefined) continue;
        captures[k] = String(v);
      }
    }

    if (includeNumeric) {
      for (let i = 1; i < m.length; i++) {
        const v = m[i];
        if (v === undefined) continue;
        captures[String(i)] = String(v);
      }
    }

    const picked = opts.pickCaptures?.length
      ? Object.fromEntries(Object.entries(captures).filter(([k]) => opts.pickCaptures!.includes(k)))
      : captures;

    // Compute 1-based line number using match index (best-effort)
    const idx = m.index ?? 0;
    const prefix = opts.content.slice(0, idx);
    const line = prefix.split(/\r\n|\r|\n/).length;

    matches.push({
      captures: picked,
      evidence: {
        filePath: opts.filePath,
        line,
        extractor: "regex",
      },
    });
  }

  return matches;
}
