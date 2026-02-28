#!/usr/bin/env node
import path from "node:path";
import fs from "node:fs";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { loadConfig, ConfigError } from "./config/loadConfig";
import { summarizeConfig } from "./config/summarizeConfig";

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

  // Step 1: do not emit IR; write a small placeholder file to prove CI wiring.
  const outAbs = path.resolve(argv.out);
  ensureParentDir(outAbs);

  const placeholder = {
    schemaVersion: "IR_V2",
    notes: "Step 1 placeholder. IR generation is implemented in later steps.",
    configPath,
    scannedRoot: path.resolve(argv.root),
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(outAbs, JSON.stringify(placeholder, null, 2) + "\n", "utf-8");

  // Print summary
  // eslint-disable-next-line no-console
  console.log("Loaded config:");
  // eslint-disable-next-line no-console
  console.log(summary);
  // eslint-disable-next-line no-console
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
