import * as yaml from "js-yaml";
import { ExtractionMatch } from "./types";

export type YamlExtractorOptions = {
  filePath: string;
  content: string;
  /**
   * If provided, select values using a dotted path (e.g. "a.b.c").
   * Works for objects and arrays with numeric segments (e.g. "items.0.name").
   */
  selectPath?: string;
  /**
   * Alternatively (or additionally), extract direct keys from the root object.
   */
  keys?: string[];
  /**
   * Capture name to use when selectPath yields a primitive value; defaults to "value".
   */
  captureName?: string;
  /**
   * If true, emit missing keys/paths with empty string value.
   */
  emitMissing?: boolean;
};

function getByPath(obj: any, p: string): any {
  const segs = p.split(".").filter(Boolean);
  let cur: any = obj;
  for (const seg of segs) {
    if (cur === null || cur === undefined) return undefined;
    const isIndex = /^\d+$/.test(seg);
    if (isIndex) {
      const idx = Number(seg);
      if (!Array.isArray(cur)) return undefined;
      cur = cur[idx];
    } else {
      if (typeof cur !== "object") return undefined;
      cur = (cur as any)[seg];
    }
  }
  return cur;
}

function toStringValue(v: any): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  // for objects/arrays, serialize compactly
  return JSON.stringify(v);
}

export function extractFromYaml(opts: YamlExtractorOptions): ExtractionMatch[] {
  let doc: any;
  try {
    doc = yaml.load(opts.content);
  } catch (e: any) {
    throw new Error(`Failed to parse YAML: ${opts.filePath}. ${e?.message ?? e}`);
  }

  const captureName = opts.captureName ?? "value";
  const emitMissing = opts.emitMissing ?? false;

  const matches: ExtractionMatch[] = [];

  if (opts.selectPath) {
    const v = getByPath(doc, opts.selectPath);
    if (v !== undefined || emitMissing) {
      matches.push({
        captures: { [captureName]: toStringValue(v) },
        evidence: { filePath: opts.filePath, extractor: "yaml", key: opts.selectPath },
      });
    }
  }

  if (opts.keys?.length) {
    for (const k of opts.keys) {
      const v = doc && typeof doc === "object" ? doc[k] : undefined;
      if (v === undefined && !emitMissing) continue;
      matches.push({
        captures: { [captureName]: toStringValue(v) },
        evidence: { filePath: opts.filePath, extractor: "yaml", key: k },
      });
    }
  }

  return matches;
}
