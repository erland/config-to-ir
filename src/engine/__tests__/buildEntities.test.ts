import path from "node:path";
import { discoverFiles } from "../../io/discoverFiles";
import { buildEntities } from "../buildEntities";
import { EntityRule } from "../../config/types";

describe("buildEntities", () => {
  test("creates entities from regex/properties/yaml extractors with deterministic IDs", async () => {
    const rootDir = path.join(__dirname, "fixtures", "repo");
    const files = await discoverFiles({
      rootDir,
      include: ["**/*.cli", "**/*.properties", "**/*.yml", "**/*.yaml"],
      exclude: ["**/target/**"],
      contextRules: [
        { name: "env", regex: "/(dev|prod)/" },
        { name: "app", regex: "/apps/([^/]+)/" },
      ],
    });

    const rules: EntityRule[] = [
      {
        type: "JmsQueue",
        idTemplate: "jms:queue:${match.queue}:${ctx.env}",
        nameTemplate: "${match.queue}",
        tags: { env: "${ctx.env}", app: "${ctx.app}" },
        extract: [
          {
            type: "regex",
            file: "**/*.cli",
            pattern: "jms-queue=(?<queue>[^: \n]+)",
          },
        ],
      },
      {
        type: "OracleSchema",
        idTemplate: "oracle:schema:${match.schema}:${ctx.env}",
        nameTemplate: "${match.schema}",
        extract: [
          {
            type: "properties",
            file: "**/*.properties",
            keys: ["datasource.schema"],
            captureName: "schema",
          },
        ],
      },
      {
        type: "ElasticIndex",
        idTemplate: "elastic:index:${match.idx}:${ctx.env}",
        nameTemplate: "${match.idx}",
        extract: [
          {
            type: "yaml",
            file: "**/*.yml",
            selectPath: "elastic.index",
            captureName: "idx",
          },
        ],
      },
    ];

    const res = await buildEntities(files, rules);

    const ids = res.entities.map((e) => e.id);
    expect(ids).toEqual([...ids].sort());

    expect(ids).toContain("jms:queue:Q.ONE:prod");
    expect(ids).toContain("oracle:schema:APP_OWNER:prod");
    expect(ids).toContain("elastic:index:my-index:prod");

    const q = res.entities.find((e) => e.type === "JmsQueue");
    expect(q?.tags.env).toBe("prod");
    expect(q?.tags.app).toBe("app1");
    expect(q?.evidence.length).toBeGreaterThan(0);
  });

  test("merges entities with same id and keeps-first tag values by default", async () => {
    const rootDir = path.join(__dirname, "fixtures", "repo");
    const files = await discoverFiles({
      rootDir,
      include: ["**/*.cli"],
      exclude: [],
      contextRules: [{ name: "env", regex: "/(dev|prod)/" }],
    });

    const rules: EntityRule[] = [
      {
        type: "Thing",
        idTemplate: "thing:${match.x}",
        tags: { source: "A" },
        extract: [{ type: "regex", file: "**/*.cli", pattern: "(?<x>Q\.ONE)" }],
      },
      {
        type: "Thing",
        idTemplate: "thing:${match.x}",
        tags: { source: "B" },
        extract: [{ type: "regex", file: "**/*.cli", pattern: "(?<x>Q\.ONE)" }],
      },
    ];

    const res = await buildEntities(files, rules);
    const e = res.entities.find((x) => x.id === "thing:Q.ONE");
    expect(e).toBeTruthy();
    expect(e?.tags.source).toBe("A"); // keep-first
    expect(e?.evidence.length).toBeGreaterThan(1);
  });
});
