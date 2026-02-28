import fs from "node:fs";
import path from "node:path";
import { extractFromProperties } from "../propertiesExtractor";

describe("extractFromProperties", () => {
  test("extracts configured keys and captures value", () => {
    const filePath = path.join(__dirname, "fixtures", "sample.properties");
    const content = fs.readFileSync(filePath, "utf-8");

    const matches = extractFromProperties({
      filePath,
      content,
      keys: ["datasource.schema", "missing.key"],
      captureName: "schema",
    });

    expect(matches.length).toBe(1);
    expect(matches[0].captures.schema).toBe("APP_OWNER");
    expect(matches[0].evidence.key).toBe("datasource.schema");
    expect(matches[0].evidence.line).toBeGreaterThan(0);
  });
});
