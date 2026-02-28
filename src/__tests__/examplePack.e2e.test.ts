import path from "node:path";
import fs from "node:fs";
import { loadConfig } from "../config/loadConfig";
import { discoverFiles } from "../io/discoverFiles";
import { buildEntities } from "../engine/buildEntities";
import { buildRelations } from "../engine/buildRelations";
import { mapFactGraphToIrV2 } from "../ir/mapToIr";
import { validateIrAgainstSchema } from "../ir/validateIr";

describe("example pack e2e", () => {
  test("builds valid IR from docs/examples/example-basic.yml + fixtures", async () => {
    const configPath = path.join(__dirname, "..", "..", "docs", "examples", "example-basic.yml");
    const rootDir = path.join(__dirname, "..", "..", "docs", "examples", "fixtures", "basic");
    const schemaPath = path.join(__dirname, "..", "..", "docs", "schemas", "ir", "ir-schema-v2.json");

    expect(fs.existsSync(configPath)).toBe(true);
    expect(fs.existsSync(rootDir)).toBe(true);
    expect(fs.existsSync(schemaPath)).toBe(true);

    const { config } = loadConfig(configPath);

    const files = await discoverFiles({
      rootDir,
      include: config.inputs.include,
      exclude: config.inputs.exclude,
      contextRules: config.context?.fromPath ?? [],
    });

    const entityRes = await buildEntities(files, config.entities);
    const relRes = buildRelations(entityRes.entities, config.relations);

    const ir = mapFactGraphToIrV2({ entities: entityRes.entities, relations: relRes.relations });

    const val = validateIrAgainstSchema(ir, schemaPath);
    expect(val.ok).toBe(true);
  });
});
