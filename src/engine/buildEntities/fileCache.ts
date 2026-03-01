import * as fs from "fs";

/**
 * Simple per-run cache of file contents keyed by absolute path.
 * This avoids repeated disk reads when multiple rules/extractors touch the same file.
 */
export type FileContentCache = Map<string, string>;

export function readFileCached(cache: FileContentCache, absPath: string): string {
  const cached = cache.get(absPath);
  if (cached !== undefined) return cached;

  const content = fs.readFileSync(absPath, "utf-8");
  cache.set(absPath, content);
  return content;
}

export function toErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  try {
    return String(e);
  } catch {
    return "Unknown error";
  }
}
