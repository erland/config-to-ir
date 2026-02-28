import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";

export type IrValidationError = {
  instancePath: string;
  message?: string;
};

export type ValidateResult = {
  ok: boolean;
  errors: IrValidationError[];
};

export function validateIrAgainstSchema(ir: unknown, schemaPath: string): ValidateResult {
  const abs = path.resolve(schemaPath);
  if (!fs.existsSync(abs)) {
    return { ok: false, errors: [{ instancePath: "", message: `Schema file not found: ${abs}` }] };
  }

  const schemaRaw = fs.readFileSync(abs, "utf-8");
  const schema = JSON.parse(schemaRaw);

  // The IR schema declares draft 2020-12. Use Ajv's 2020 build.
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);

  const validate = ajv.compile(schema);
  const ok = validate(ir) as boolean;

  const errors = (validate.errors ?? []).map((e) => ({
    instancePath: e.instancePath ?? "",
    message: e.message ?? "",
  }));

  return { ok, errors };
}
