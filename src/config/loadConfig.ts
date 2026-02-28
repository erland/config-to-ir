import fs from "node:fs";
import path from "node:path";
import * as yaml from "js-yaml";
import { ToolConfig, ToolConfigSchema } from "./types";

export type LoadConfigResult = {
  config: ToolConfig;
  configPath: string;
};

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export function loadConfig(configPath: string): LoadConfigResult {
  const abs = path.resolve(configPath);
  if (!fs.existsSync(abs)) {
    throw new ConfigError(`Config file not found: ${abs}`);
  }

  const raw = fs.readFileSync(abs, "utf-8");
  let parsed: unknown;

  try {
    parsed = yaml.load(raw);
  } catch (e: any) {
    throw new ConfigError(`Failed to parse YAML config: ${abs}. ${e?.message ?? e}`);
  }

  const result = ToolConfigSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `- ${i.path.join(".") || "<root>"}: ${i.message}`)
      .join("\n");
    throw new ConfigError(`Invalid config shape for: ${abs}\n${issues}`);
  }

  return { config: result.data, configPath: abs };
}
