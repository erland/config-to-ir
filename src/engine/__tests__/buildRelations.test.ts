import { buildRelations } from "../buildRelations";
import { FactEntity } from "../factGraph";
import { RelationRule } from "../../config/types";

describe("buildRelations", () => {
  test("links entities by id template with sameTags constraint", () => {
    const entities: FactEntity[] = [
      { id: "srv:one:prod", type: "Server", name: "one", tags: { env: "prod", app: "a" }, evidence: [{ filePath: "f" }] },
      { id: "q:Q1:prod", type: "Queue", name: "Q1", tags: { env: "prod", app: "a" }, evidence: [{ filePath: "g" }] },
      { id: "q:Q1:dev", type: "Queue", name: "Q1", tags: { env: "dev", app: "a" }, evidence: [{ filePath: "h" }] },
    ];

    const rules: RelationRule[] = [
      {
        name: "server_uses_queue",
        kind: "DEPENDENCY",
        from: { entityType: "Server" },
        to: {
          entityType: "Queue",
          resolve: { by: "id", template: "q:Q1:${from.tags.env}" },
        },
        constraints: { sameTags: ["env", "app"] },
        onUnresolved: "error",
        onAmbiguous: "error",
      },
    ];

    const res = buildRelations(entities, rules);
    expect(res.diagnostics.filter(d => d.severity === "error").length).toBe(0);
    expect(res.relations.length).toBe(1);
    expect(res.relations[0].fromId).toBe("srv:one:prod");
    expect(res.relations[0].toId).toBe("q:Q1:prod");
  });

  test("warns and picks deterministic first on ambiguous matches", () => {
    const entities: FactEntity[] = [
      { id: "a", type: "A", name: "a", tags: {}, evidence: [{ filePath: "f" }] },
      { id: "b1", type: "B", name: "x", tags: { key: "v" }, evidence: [{ filePath: "g" }] },
      { id: "b0", type: "B", name: "x", tags: { key: "v" }, evidence: [{ filePath: "h" }] },
    ];

    const rules: RelationRule[] = [
      {
        name: "amb",
        kind: "DEPENDENCY",
        from: { entityType: "A" },
        to: { entityType: "B", resolve: { by: "name", template: "x" } },
        onUnresolved: "warn",
        onAmbiguous: "warn-pick-first",
      },
    ];

    const res = buildRelations(entities, rules);
    expect(res.relations.length).toBe(1);
    expect(res.relations[0].toId).toBe("b0"); // lexical smallest
    expect(res.diagnostics.some(d => d.severity === "warning")).toBe(true);
  });
});
