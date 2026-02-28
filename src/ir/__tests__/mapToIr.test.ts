import { mapFactGraphToIrV2 } from "../mapToIr";
import { FactEntity, FactRelation } from "../../engine/factGraph";

describe("mapFactGraphToIrV2", () => {
  test("maps entities and relations deterministically and normalizes kinds", () => {
    const entities: FactEntity[] = [
      { id: "b", type: "X", name: "B", classifierKind: "class", tags: { z: "1", a: "2" }, evidence: [{ filePath: "f", line: 2 }] },
      { id: "a", type: "X", name: "A", classifierKind: "UNKNOWN", tags: {}, evidence: [{ filePath: "g" }] },
    ];
    const relations: FactRelation[] = [
      { id: "r2", kind: "dependency", fromId: "b", toId: "a", tags: { k: "v" }, evidence: [{ filePath: "h" }] },
      { id: "r1", kind: "NOPE", fromId: "a", toId: "b", tags: {}, evidence: [{ filePath: "i" }] },
    ];

    const ir = mapFactGraphToIrV2({ entities, relations });

    expect(ir.schemaVersion).toBe("IR_V2");
    expect(ir.classifiers.map(c => c.id)).toEqual(["a", "b"]);
    expect(ir.classifiers.find(c => c.id === "a")?.kind).toBe("CLASS"); // defaulted
    expect(ir.classifiers.find(c => c.id === "b")?.kind).toBe("CLASS"); // normalized
    expect(ir.classifiers.find(c => c.id === "b")?.taggedValues?.map(tv => tv.key)).toEqual(["a", "z"]);

    expect(ir.relations?.map(r => r.id)).toEqual(["r1", "r2"]);
    expect(ir.relations?.find(r => r.id === "r1")?.kind).toBe("DEPENDENCY"); // defaulted
    expect(ir.relations?.find(r => r.id === "r2")?.kind).toBe("DEPENDENCY"); // normalized
  });
});
