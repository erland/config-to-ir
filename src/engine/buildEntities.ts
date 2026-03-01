import fs from "node:fs";
import { DiscoveredFile } from "../io/discoverFiles";
import { EntityRule, EntityExtract } from "../config/types";
import { extractWithRegex } from "../parse/regexExtractor";
import { extractFromProperties } from "../parse/propertiesExtractor";
import { extractFromYaml } from "../parse/yamlExtractor";
import { FactEntity } from "./factGraph";
import { Diagnostic, warn, err } from "./diagnostics";
import { renderTemplate } from "./templates";
import picomatch = require("picomatch");

export type BuildEntitiesResult = {
  entities: FactEntity[];
  diagnostics: Diagnostic[];
};

type FileContentCache = Map<string, string>;

type GlobMatcher = (relPath: string) => boolean;

function toErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

function readFileCached(cache: FileContentCache, absPath: string): string {
  const hit = cache.get(absPath);
  if (hit !== undefined) return hit;
  const content = fs.readFileSync(absPath, "utf-8");
  cache.set(absPath, content);
  return content;
}

function getGlobMatcher(cache: Map<string, GlobMatcher>, globPattern: string): GlobMatcher {
  const hit = cache.get(globPattern);
  if (hit) return hit;
  const matcher = picomatch(globPattern, { dot: true }) as GlobMatcher;
  cache.set(globPattern, matcher);
  return matcher;
}

function getApplicableFiles(
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

function runExtract(ex: EntityExtract, filePathAbs: string, relPath: string, content: string) {
  switch (ex.type) {
    case "regex":
      return extractWithRegex({
        filePath: filePathAbs,
        content,
        pattern: ex.pattern,
        flags: ex.flags,
        pickCaptures: ex.pickCaptures,
      });
    case "properties":
      return extractFromProperties({
        filePath: filePathAbs,
        content,
        keys: ex.keys,
        captureName: ex.captureName,
        emitMissing: ex.emitMissing,
      });
    case "yaml":
      return extractFromYaml({
        filePath: filePathAbs,
        content,
        selectPath: ex.selectPath,
        keys: ex.keys,
        captureName: ex.captureName,
        emitMissing: ex.emitMissing,
      });
    default:
      return [];
  }
}

/**
 * Applies entity rules to discovered files to produce a deterministic list of entities.
 * Merge policy:
 * - entities are keyed by id
 * - evidence arrays are concatenated and deduplicated by (filePath,line,key,extractor)
 * - tags merged per rule.merge.tagMerge
 */
export async function buildEntities(
  discovered: DiscoveredFile[],
  rules: EntityRule[],
): Promise<BuildEntitiesResult> {
  const diagnostics: Diagnostic[] = [];
  const cache: FileContentCache = new Map();

  // Cache glob compilation + applicable file sets since many rules reuse the same globs.
  const matcherCache = new Map<string, GlobMatcher>();
  const applicableFilesCache = new Map<string, DiscoveredFile[]>();

  const byId = new Map<string, FactEntity>();

  for (const rule of rules) {
    const merge = rule.merge ?? { tagMerge: "keep-first", warnOnNameMismatch: true };

    for (const ex of rule.extract) {
      const applicableFiles = getApplicableFiles(discovered, matcherCache, applicableFilesCache, ex.file);

      for (const file of applicableFiles) {
        let content: string;
        try {
          content = readFileCached(cache, file.absPath);
        } catch (e: unknown) {
          diagnostics.push(err(`Failed to read file: ${file.absPath}. ${toErrorMessage(e)}`, { filePath: file.absPath }));
          continue;
        }

        let matches = [];
        try {
          matches = runExtract(ex, file.absPath, file.relPath, content);
        } catch (e: unknown) {
          diagnostics.push(err(`Extractor failed for ${file.relPath}: ${toErrorMessage(e)}`, {
            filePath: file.absPath,
            ruleType: ex.type,
            entityType: rule.type,
          }));
          continue;
        }

        for (const m of matches) {
          const ctx = file.context ?? {};
          const matchCaps = m.captures ?? {};

          const id = renderTemplate(rule.idTemplate, { ctx, match: matchCaps });
          if (!id) {
            diagnostics.push(warn(`Entity rule '${rule.type}' produced empty id (template resolved to empty).`, {
              filePath: file.absPath,
              ruleType: ex.type,
              entityType: rule.type,
            }));
            continue;
          }

          const nameTemplate =
            rule.nameTemplate ??
            (matchCaps["name"] ? "${match.name}" : undefined) ??
            id;

          const name = renderTemplate(nameTemplate, { ctx, match: matchCaps }) || id;

          const tags: Record<string, string> = {};
          for (const [k, templ] of Object.entries(rule.tags ?? {})) {
            tags[k] = renderTemplate(templ, { ctx, match: matchCaps });
          }

          const incoming: FactEntity = {
            id,
            type: rule.type,
            name,
            classifierKind: rule.classifierKind,
            stereotypeId: rule.stereotypeId,
            tags,
            evidence: [m.evidence],
          };

          const existing = byId.get(id);
          if (!existing) {
            byId.set(id, incoming);
            continue;
          }

          // Merge
          if (merge.warnOnNameMismatch && existing.name !== incoming.name) {
            diagnostics.push(
              warn(`Entity id '${id}' has differing names ('${existing.name}' vs '${incoming.name}'). Keeping first.`, {
                entityId: id,
                entityType: rule.type,
                filePath: file.absPath,
              }),
            );
          }

          // Merge tags
          for (const [k, v] of Object.entries(incoming.tags)) {
            if (existing.tags[k] === undefined) {
              existing.tags[k] = v;
            } else if (merge.tagMerge === "overwrite") {
              existing.tags[k] = v;
            }
          }

          // Merge evidence (dedupe)
          const seen = new Set(existing.evidence.map((ev) => `${ev.filePath}|${ev.line ?? ""}|${ev.key ?? ""}|${ev.extractor ?? ""}`));
          for (const ev of incoming.evidence) {
            const key = `${ev.filePath}|${ev.line ?? ""}|${ev.key ?? ""}|${ev.extractor ?? ""}`;
            if (!seen.has(key)) {
              existing.evidence.push(ev);
              seen.add(key);
            }
          }
        }
      }
    }
  }

  const entities = Array.from(byId.values()).sort((a, b) => a.id.localeCompare(b.id));
  return { entities, diagnostics };
}
