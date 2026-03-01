#!/usr/bin/env node
import path from "node:path";
import { loadConfig, ConfigError } from "./config/loadConfig";
import { summarizeConfig } from "./config/summarizeConfig";
import { discoverFiles } from "./io/discoverFiles";
import { buildEntities } from "./engine/buildEntities";
import { buildRelations } from "./engine/buildRelations";
import { mapFactGraphToIrV2 } from "./ir/mapToIr";
import { validateIrAgainstSchema } from "./ir/validateIr";
import { buildRunSummary, formatHumanReport } from "./report/report";
import { parseArgs } from "./cli/args";
import { writeJson, writeText } from "./cli/fs";
import { getExitCode } from "./cli/exit";

async function main() {
  const argv = await parseArgs(process.argv);

  const { config } = loadConfig(argv.config);
  const summary = summarizeConfig(config);

  const files = await discoverFiles({
    rootDir: argv.root,
    include: config.inputs.include,
    exclude: config.inputs.exclude,
    contextRules: config.context?.fromPath ?? [],
  });

  const entityResult = await buildEntities(files, config.entities);

  const relationResult = buildRelations(entityResult.entities, config.relations);

  const allDiagnostics = [...entityResult.diagnostics, ...relationResult.diagnostics];

  const summaryObj = buildRunSummary({
    scannedRoot: path.resolve(argv.root),
    fileCount: files.length,
    entityCount: entityResult.entities.length,
    relationCount: relationResult.relations.length,
    entities: entityResult.entities,
    relations: relationResult.relations,
    diagnostics: allDiagnostics,
    sampleLimit: 50,
  });


  const outAbs = path.resolve(argv.out);
  const ir = mapFactGraphToIrV2({
    entities: entityResult.entities,
    relations: relationResult.relations,
  });

  const schemaRes = validateIrAgainstSchema(ir, argv.schema);
  if (!schemaRes.ok) {
    throw new Error(`IR schema validation failed:
${schemaRes.formatted}`);
  }

  writeJson(outAbs, ir);

  if (argv.report) {
    const reportAbs = path.resolve(argv.report);
    if (argv.reportFormat === "text") {
      writeText(reportAbs, formatHumanReport(summaryObj));
    } else {
      writeJson(reportAbs, summaryObj);
    }
    console.log(`Wrote report to: ${reportAbs}`);
  }

  // Print summary
  // eslint-disable-next-line no-console
  console.log("Loaded config:");
  // eslint-disable-next-line no-console
  console.log(summary);
  // eslint-disable-next-line no-console
  console.log(`Discovered files: ${files.length}`);
  console.log(`Discovered entities: ${entityResult.entities.length}`);
  console.log(`Discovered relations: ${relationResult.relations.length}`);
  console.log(`Wrote IR to: ${outAbs}`);

  const exitCode = getExitCode({
    errorCount: summaryObj.errorCount,
    warningCount: summaryObj.warningCount,
    strict: argv.strict,
  });
  if (exitCode !== 0) process.exit(exitCode);
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
