import { ExtractionMatch } from "./types";
import { parseProperties } from "./properties";

export type PropertiesExtractorOptions = {
  filePath: string;
  content: string;
  /**
   * Keys to extract. If a key is missing it is ignored (no match emitted).
   */
  keys: string[];
  /**
   * Capture name to use; defaults to "value".
   */
  captureName?: string;
  /**
   * If true, emit a match even when the key is missing (value will be "").
   * Default: false
   */
  emitMissing?: boolean;
};

export function extractFromProperties(opts: PropertiesExtractorOptions): ExtractionMatch[] {
  const { values, lineByKey } = parseProperties(opts.content);
  const captureName = opts.captureName ?? "value";
  const emitMissing = opts.emitMissing ?? false;

  const matches: ExtractionMatch[] = [];
  for (const key of opts.keys) {
    const val = values[key];
    if (val === undefined && !emitMissing) continue;

    matches.push({
      captures: { [captureName]: String(val ?? "") },
      evidence: {
        filePath: opts.filePath,
        line: lineByKey[key],
        key,
        extractor: "properties",
      },
    });
  }
  return matches;
}
