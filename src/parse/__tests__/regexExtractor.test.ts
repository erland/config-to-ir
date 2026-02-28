import fs from "node:fs";
import path from "node:path";
import { extractWithRegex } from "../regexExtractor";

describe("extractWithRegex", () => {
  test("extracts named capture groups and line numbers", () => {
    const filePath = path.join(__dirname, "fixtures", "sample.cli");
    const content = fs.readFileSync(filePath, "utf-8");

    const matches = extractWithRegex({
      filePath,
      content,
      pattern: "jms-queue=(?<queueName>[^: \n]+)",
    });

    expect(matches.length).toBe(1);
    expect(matches[0].captures.queueName).toBe("Q.TEST");
    expect(matches[0].evidence.filePath).toBe(filePath);
    expect(matches[0].evidence.line).toBeGreaterThan(0);
  });

  test("extracts numeric captures when no named groups exist", () => {
    const matches = extractWithRegex({
      filePath: "x",
      content: "env/prod/apps/app1/a.cli",
      pattern: "/(dev|prod)/",
    });
    expect(matches[0].captures["1"]).toBe("prod");
  });
});
