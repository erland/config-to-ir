import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { execFileSync } from "node:child_process";

import { validateIrAgainstSchema } from "../ir/validateIr";

function ensureBuilt(projectRoot: string) {
  const distCli = path.join(projectRoot, "dist", "cli.js");
  if (fs.existsSync(distCli)) return;

  // Build once so we can run the real CLI entrypoint.
  execFileSync("npm", ["run", "build"], {
    cwd: projectRoot,
    stdio: "inherit",
  });
}

describe("cli contract", () => {
  test(
    "--out writes validated IR and --report writes run summary without clobbering IR",
    () => {
      const projectRoot = path.join(__dirname, "..", "..");
      ensureBuilt(projectRoot);

      const configPath = path.join(projectRoot, "docs", "examples", "example-basic.yml");
      const rootDir = path.join(projectRoot, "docs", "examples", "fixtures", "basic");
      const schemaPath = path.join(projectRoot, "docs", "schemas", "ir", "ir-schema-v2.json");

      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "config-to-ir-cli-"));
      const outPath = path.join(tmpDir, "model.ir.json");
      const reportPath = path.join(tmpDir, "report.json");

      const distCli = path.join(projectRoot, "dist", "cli.js");
      expect(fs.existsSync(distCli)).toBe(true);

      execFileSync(
        "node",
        [
          distCli,
          "--config",
          configPath,
          "--root",
          rootDir,
          "--schema",
          schemaPath,
          "--out",
          outPath,
          "--report",
          reportPath,
          "--reportFormat",
          "json",
        ],
        { cwd: projectRoot, stdio: "inherit" },
      );

      // IR contract
      expect(fs.existsSync(outPath)).toBe(true);
      const ir = JSON.parse(fs.readFileSync(outPath, "utf-8"));
      expect(ir).toHaveProperty("schemaVersion");
      expect(ir).toHaveProperty("classifiers");
      const val = validateIrAgainstSchema(ir, schemaPath);
      expect(val.ok).toBe(true);

      // Report contract (should exist and not overwrite IR)
      expect(fs.existsSync(reportPath)).toBe(true);
      const report = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
      expect(report).toHaveProperty("fileCount");
      expect(report).toHaveProperty("entityCount");
      expect(report).toHaveProperty("relationCount");
      expect(report).toHaveProperty("warningCount");
      expect(report).toHaveProperty("errorCount");
    },
    60_000,
  );
});
