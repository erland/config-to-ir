import { DiscoveredFile } from "../../io/discoverFiles";
import picomatch = require("picomatch");

export type GlobMatcher = (relPath: string) => boolean;

function getGlobMatcher(cache: Map<string, GlobMatcher>, globPattern: string): GlobMatcher {
  const hit = cache.get(globPattern);
  if (hit) return hit;
  const matcher = picomatch(globPattern, { dot: true }) as GlobMatcher;
  cache.set(globPattern, matcher);
  return matcher;
}

/**
 * Returns discovered files matching a glob. Uses caches to avoid recompiling globs
 * and re-filtering the same glob across multiple rules.
 */
export function getApplicableFiles(
  discovered: DiscoveredFile[],
  matcherCache: Map<string, GlobMatcher>,
  applicableCache: Map<string, DiscoveredFile[]>,
  globPattern: string,
): DiscoveredFile[] {
  const hit = applicableCache.get(globPattern);
  if (hit) return hit;

  const isMatch = getGlobMatcher(matcherCache, globPattern);
  const files = discovered.filter((f) => isMatch(f.relPath));
  applicableCache.set(globPattern, files);
  return files;
}
