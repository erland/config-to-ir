import fs from "node:fs";
import path from "node:path";
import { extractFromYaml } from "../yamlExtractor";

describe("extractFromYaml", () => {
  test("selectPath extracts nested values", () => {
    const filePath = path.join(__dirname, "fixtures", "sample.yml");
    const content = fs.readFileSync(filePath, "utf-8");

    const matches = extractFromYaml({
      filePath,
      content,
      selectPath: "a.b.c",
      captureName: "v",
    });

    expect(matches.length).toBe(1);
    expect(matches[0].captures.v).toBe("hello");
    expect(matches[0].evidence.key).toBe("a.b.c");
  });

  test("selectPath supports array indexes", () => {
    const filePath = path.join(__dirname, "fixtures", "sample.yml");
    const content = fs.readFileSync(filePath, "utf-8");

    const matches = extractFromYaml({
      filePath,
      content,
      selectPath: "items.0.name",
    });

    expect(matches[0].captures.value).toBe("first");
  });

  test("keys extracts root keys", () => {
    const filePath = path.join(__dirname, "fixtures", "sample.yml");
    const content = fs.readFileSync(filePath, "utf-8");

    const matches = extractFromYaml({
      filePath,
      content,
      keys: ["a", "missing"],
    });

    // "a" exists and is object; we stringify it
    expect(matches.length).toBe(1);
    expect(matches[0].evidence.key).toBe("a");
    expect(matches[0].captures.value).toContain("\"b\":");
  });
});
