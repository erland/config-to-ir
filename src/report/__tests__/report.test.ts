import { buildRunSummary, formatHumanReport } from "../report";
import { Diagnostic } from "../../engine/diagnostics";

describe("report", () => {
  test("buildRunSummary counts entities/relations/diagnostics deterministically", () => {
    const diagnostics: Diagnostic[] = [
      { severity: "warning", message: "w1" },
      { severity: "error", message: "e1" },
    ];

    const summary = buildRunSummary({
      scannedRoot: "/x",
      fileCount: 2,
      entityCount: 3,
      relationCount: 1,
      entities: [{ type: "B" }, { type: "A" }, { type: "A" }],
      relations: [{ kind: "DEPENDENCY" }],
      diagnostics,
      sampleLimit: 10,
    });

    expect(summary.warningCount).toBe(1);
    expect(summary.errorCount).toBe(1);
    expect(Object.keys(summary.entitiesByType)).toEqual(["A", "B"]);
    expect(summary.entitiesByType.A).toBe(2);
  });

  test("formatHumanReport includes key sections", () => {
    const summary = buildRunSummary({
      scannedRoot: "/x",
      fileCount: 1,
      entityCount: 1,
      relationCount: 0,
      entities: [{ type: "X" }],
      relations: [],
      diagnostics: [{ severity: "warning", message: "hello", filePath: "f" }],
    });

    const txt = formatHumanReport(summary);
    expect(txt).toContain("Scan root:");
    expect(txt).toContain("Entities by type:");
    expect(txt).toContain("[warning] hello");
  });
});
