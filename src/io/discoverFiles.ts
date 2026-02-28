import path from "node:path";
import fg from "fast-glob";
import { extractContextFromPath, PathContext, PathContextRule } from "./pathContext";

export type DiscoveredFile = {
  /** Absolute path on disk */
  absPath: string;
  /** Path relative to scan root, using POSIX separators */
  relPath: string;
  /** Extracted path context */
  context: PathContext;
};

export type DiscoverFilesOptions = {
  rootDir: string;
  include: string[];
  exclude?: string[];
  contextRules?: PathContextRule[];
};

/**
 * Discovers files under rootDir using include/exclude glob patterns.
 * Globs are evaluated relative to rootDir.
 *
 * Returns deterministic ordering (lexical by relPath).
 */
export async function discoverFiles(opts: DiscoverFilesOptions): Promise<DiscoveredFile[]> {
  const rootAbs = path.resolve(opts.rootDir);
  const include = opts.include ?? [];
  const exclude = opts.exclude ?? [];
  const contextRules = opts.contextRules ?? [];

  const entries = await fg(include, {
    cwd: rootAbs,
    ignore: exclude,
    onlyFiles: true,
    dot: true,
    followSymbolicLinks: true,
  });

  const files: DiscoveredFile[] = entries
    .map((rel) => {
      // Normalize to POSIX separators for stability (fast-glob returns posix-ish on most platforms)
      const relPosix = rel.split(path.sep).join(path.posix.sep);
      const abs = path.join(rootAbs, rel);
      const ctx = extractContextFromPath(relPosix, contextRules);
      return { absPath: abs, relPath: relPosix, context: ctx };
    })
    .sort((a, b) => a.relPath.localeCompare(b.relPath));

  return files;
}
