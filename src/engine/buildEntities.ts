import { DiscoveredFile } from "../io/discoverFiles";
import { EntityRule } from "../config/types";
import { FactEntity } from "./factGraph";
import { Diagnostic, warn, err } from "./diagnostics";
import { renderTemplate } from "./templates";
import { FileContentCache, readFileCached, toErrorMessage } from "./buildEntities/fileCache";
import { GlobMatcher, getApplicableFiles } from "./buildEntities/globCache";
import { runExtract } from "./buildEntities/extract";
import { EntityMergePolicy, mergeEntityById } from "./buildEntities/merge";

export type BuildEntitiesResult = {
  entities: FactEntity[];
  diagnostics: Diagnostic[];
};

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
  const fileCache: FileContentCache = new Map();

  // Cache glob compilation + applicable file sets since many rules reuse the same globs.
  const matcherCache = new Map<string, GlobMatcher>();
  const applicableFilesCache = new Map<string, DiscoveredFile[]>();

  const byId = new Map<string, FactEntity>();

  for (const rule of rules) {
    const merge: EntityMergePolicy = rule.merge ?? { tagMerge: "keep-first", warnOnNameMismatch: true };

    for (const ex of rule.extract) {
      const applicableFiles = getApplicableFiles(discovered, matcherCache, applicableFilesCache, ex.file);

      for (const file of applicableFiles) {
        let content: string;
        try {
          content = readFileCached(fileCache, file.absPath);
        } catch (e: unknown) {
          diagnostics.push(err(`Failed to read file: ${file.absPath}. ${toErrorMessage(e)}`, { filePath: file.absPath }));
          continue;
        }

        let matches = [];
        try {
          matches = runExtract(ex, file.absPath, content);
        } catch (e: unknown) {
          diagnostics.push(
            err(`Extractor failed for ${file.relPath}: ${toErrorMessage(e)}`, {
              filePath: file.absPath,
              ruleType: ex.type,
              entityType: rule.type,
            }),
          );
          continue;
        }

        for (const m of matches) {
          const ctx = file.context ?? {};
          const matchCaps = m.captures ?? {};

          const id = renderTemplate(rule.idTemplate, { ctx, match: matchCaps });
          if (!id) {
            diagnostics.push(
              warn(`Entity rule '${rule.type}' produced empty id (template resolved to empty).`, {
                filePath: file.absPath,
                ruleType: ex.type,
                entityType: rule.type,
              }),
            );
            continue;
          }

          const nameTemplate = rule.nameTemplate ?? (matchCaps["name"] ? "${match.name}" : undefined) ?? id;
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

          mergeEntityById({
            byId,
            incoming,
            merge,
            diagnostics,
            filePath: file.absPath,
            entityType: rule.type,
          });
        }
      }
    }
  }

  const entities = Array.from(byId.values()).sort((a, b) => a.id.localeCompare(b.id));
  return { entities, diagnostics };
}
