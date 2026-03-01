import yargs from "yargs";
import { hideBin } from "yargs/helpers";

export type Args = {
  root: string;
  config: string;
  out: string;
  schema: string;
  report?: string;
  reportFormat: "json" | "text";
  strict: boolean;
};

export async function parseArgs(argv: string[]): Promise<Args> {
  return (await yargs(hideBin(argv))
    .scriptName("config-to-ir")
    .usage("$0 --config <path> --root <dir> --out <path> [--strict]")
    .option("root", {
      type: "string",
      describe: "Root directory to scan.",
      default: ".",
    })
    .option("config", {
      type: "string",
      describe: "Path to YAML config file.",
      demandOption: true,
    })
    .option("report", {
      type: "string",
      describe: "Optional path to write a diagnostics report (json or text).",
    })
    .option("reportFormat", {
      type: "string",
      choices: ["json", "text"],
      default: "json",
      describe: "Report output format when --report is used.",
    })
    .option("schema", {
      type: "string",
      describe: "Path to IR v2 JSON schema for validation.",
      default: "docs/schemas/ir/ir-schema-v2.json",
    })
    .option("out", {
      type: "string",
      describe: "Output path for IR JSON.",
      default: "out/model.ir.json",
    })
    .option("strict", {
      type: "boolean",
      describe: "Fail on warnings.",
      default: false,
    })
    .help()
    .parse()) as unknown as Args;
}
