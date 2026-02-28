#!/usr/bin/env node
import path from "node:path";
import fs from "node:fs";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { loadConfig, ConfigError } from "./config/loadConfig";
import { summarizeConfig } from "./config/summarizeConfig";
import { discoverFiles } from "./io/discoverFiles";
import { buildEntities } from "./engine/buildEntities";
import { buildRelations } from "./engine/buildRelations";

type Args = {
  root: string;
  config: string;
  out: string;
  strict: boolean;
};

function ensureParentDir(filePath: string) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

async function main() {
  const argv = (await yargs(hideBin(process.argv))
    .scriptName("config-to-ir")
    .usage("$0 --config <path> --root <dir> --out <path> [--strict]")
    .option("root", {
      type: "string",
      describe: "Root directory to scan (future steps).",
      default: ".",
    })
    .option("config", {
      type: "string",
      describe: "Path to YAML config file.",
      demandOption: true,
    })
    .option("out", {
      type: "string",
      describe: "Output path for IR JSON (future steps).",
      default: "out/model.ir.json",
    })
    .option("strict", {
      type: "boolean",
      describe: "Fail on warnings (future steps). Step 1 uses it for config validation only.",
      default: false,
    })
    .help()
    .parse()) as unknown as Args;

  const { config, configPath } = loadConfig(argv.config);
  const summary = summarizeConfig(config);
function countByType(entities: { type: string }[]): Record<string, number> {
  return entities.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] ?? 0) + 1;
    return acc;
  }, {});
}

function countDiagnostics(diags: { severity: string }[]) {
  return {
    warningCount: diags.filter((d) => d.severity === "warning").length,
    errorCount: diags.filter((d) => d.severity === "error").length,
  };
}


  const files = await discoverFiles({
    rootDir: argv.root,
    include: config.inputs.include,
    exclude: config.inputs.exclude,
    contextRules: config.context?.fromPath ?? [],
  });

  const entityResult = await buildEntities(files, config.entities);

  const relationResult = buildRelations(entityResult.entities, config.relations);

  const allDiagnostics = [...entityResult.diagnostics, ...relationResult.diagnostics];


  // Step 1: do not emit IR; write a small placeholder file to prove CI wiring.
  const outAbs = path.resolve(argv.out);
  ensureParentDir(outAbs);

  const placeholder = {
    schemaVersion: "IR_V2",
    notes: "Step 1 placeholder. IR generation is implemented in later steps.",
    configPath,
    scannedRoot: path.resolve(argv.root),
    generatedAt: new Date().toISOString(),
    discoveredFiles: {
      count: files.length,
      sample: files.slice(0, 20).map(f => ({ relPath: f.relPath, context: f.context })),
    },
    discoveredEntities: {
      count: entityResult.entities.length,
      byType: countByType(entityResult.entities),
    },
    discoveredRelations: {
      count: relationResult.relations.length,
      byKind: Object.fromEntries(Object.entries(relationResult.relations.reduce<Record<string, number>>((acc, r) => { acc[r.kind] = (acc[r.kind] ?? 0) + 1; return acc; }, {})).sort(([a],[b])=>a.localeCompare(b))),
    },
    diagnostics: {
      warningCount: countDiagnostics(allDiagnostics).warningCount,
      errorCount: countDiagnostics(allDiagnostics).errorCount,
      sample: allDiagnostics.slice(0, 20),
    },
  };

  fs.writeFileSync(outAbs, JSON.stringify(placeholder, null, 2) + "\n", "utf-8");

  // Print summary
  // eslint-disable-next-line no-console
  console.log("Loaded config:");
  // eslint-disable-next-line no-console
  console.log(summary);
  // eslint-disable-next-line no-console
  console.log(`Discovered files: ${files.length}`);
  console.log(`Discovered entities: ${entityResult.entities.length}`);
  console.log(`Discovered relations: ${relationResult.relations.length}`);
  console.log(`Wrote placeholder output to: ${outAbs}`);
}

main().catch((err) => {
  if (err instanceof ConfigError) {
    // eslint-disable-next-line no-console
    console.error(err.message);
    process.exit(2);
  }
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
