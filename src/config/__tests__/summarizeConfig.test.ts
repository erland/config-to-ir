import { summarizeConfig } from "../summarizeConfig";
import { ToolConfig } from "../types";

describe("summarizeConfig", () => {
  test("prints a stable summary", () => {
    const cfg: ToolConfig = {
      version: 1,
      inputs: { root: ".", include: ["**/*.cli"], exclude: [] },
      context: { fromPath: [] },
      entities: [],
      relations: [],
    };
    const summary = summarizeConfig(cfg);
    expect(summary).toContain("version: 1");
    expect(summary).toContain("inputs.include: 1 pattern(s)");
  });
});
