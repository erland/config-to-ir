import path from "node:path";
import { validateIrAgainstSchema } from "../validateIr";

describe("validateIrAgainstSchema", () => {
  test("accepts minimal valid IR", () => {
    const schemaPath = path.join(__dirname, "..", "..", "..", "docs", "schemas", "ir", "ir-schema-v2.json");
    const ir = {
      schemaVersion: "IR_V2",
      classifiers: [
        { id: "c1", name: "C1", kind: "CLASS" },
      ],
    };
    const res = validateIrAgainstSchema(ir, schemaPath);
    expect(res.ok).toBe(true);
  });

  test("rejects invalid IR (missing classifiers)", () => {
    const schemaPath = path.join(__dirname, "..", "..", "..", "docs", "schemas", "ir", "ir-schema-v2.json");
    const ir = { schemaVersion: "IR_V2" };
    const res = validateIrAgainstSchema(ir, schemaPath);
    expect(res.ok).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });
});
