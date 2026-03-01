import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import type { ValidateFunction } from "ajv";

export type IrValidationError = {
  instancePath: string;
  message?: string;
};

export type ValidateResult = {
  ok: boolean;
  errors: IrValidationError[];
  /**
   * A human-friendly formatted error list suitable for CLI output.
   * Empty string when ok=true.
   */
  formatted: string;
  schemaAbs: string;
};

type CachedValidator = {
  schemaAbs: string;
  mtimeMs: number;
  validate: ValidateFunction;
};

// Cache validators by absolute schema path to avoid recompiling on each run.
const validatorCache = new Map<string, CachedValidator>();

export function formatIrValidationErrors(errors: IrValidationError[]): string {
  if (!errors.length) return "";
  return errors
    .map((e) => `- ${e.instancePath || "<root>"}: ${e.message || "invalid"}`)
    .join("\n");
}

function loadOrGetValidator(schemaAbs: string): CachedValidator {
  const stat = fs.statSync(schemaAbs);
  const mtimeMs = stat.mtimeMs;

  const cached = validatorCache.get(schemaAbs);
  if (cached && cached.mtimeMs === mtimeMs) return cached;

  const schemaRaw = fs.readFileSync(schemaAbs, "utf-8");
  const schema = JSON.parse(schemaRaw);

  // The IR schema declares draft 2020-12. Use Ajv's 2020 build.
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);

  const validate = ajv.compile(schema);

  const next: CachedValidator = { schemaAbs, mtimeMs, validate };
  validatorCache.set(schemaAbs, next);
  return next;
}

export function validateIrAgainstSchema(ir: unknown, schemaPath: string): ValidateResult {
  const schemaAbs = path.resolve(schemaPath);
  if (!fs.existsSync(schemaAbs)) {
    const errors = [{ instancePath: "", message: `Schema file not found: ${schemaAbs}` }];
    return { ok: false, errors, formatted: formatIrValidationErrors(errors), schemaAbs };
  }

  const cached = loadOrGetValidator(schemaAbs);
  const ok = cached.validate(ir) as boolean;

  const errors = (cached.validate.errors ?? []).map((e) => ({
    instancePath: e.instancePath ?? "",
    message: e.message ?? "",
  }));

  return { ok, errors, formatted: ok ? "" : formatIrValidationErrors(errors), schemaAbs };
}
