import path from "node:path";
import { discoverFiles } from "../discoverFiles";

describe("discoverFiles", () => {
  test("discovers files using include/exclude patterns and extracts context", async () => {
    const rootDir = path.join(__dirname, "fixtures", "sampleRoot");
    const files = await discoverFiles({
      rootDir,
      include: ["**/*.cli", "**/*.properties", "**/*.yml", "**/*.yaml"],
      exclude: ["**/target/**"],
      contextRules: [
        { name: "env", regex: "/(dev|prod)/" },
        { name: "app", regex: "/apps/([^/]+)/" },
      ],
    });

    const relPaths = files.map((f) => f.relPath);
    expect(relPaths).toContain("prod/apps/app1/a.cli");
    expect(relPaths).toContain("prod/apps/app1/b.properties");
    expect(relPaths).toContain("dev/apps/app2/c.yml");
    expect(relPaths).not.toContain("prod/apps/app1/target/ignored.cli");

    const a = files.find((f) => f.relPath.endsWith("a.cli"));
    expect(a?.context).toEqual({ env: "prod", app: "app1" });
  });

  test("returns deterministic ordering", async () => {
    const rootDir = path.join(__dirname, "fixtures", "sampleRoot");
    const files = await discoverFiles({
      rootDir,
      include: ["**/*.*"],
      exclude: ["**/target/**"],
      contextRules: [],
    });

    const sorted = [...files].sort((a, b) => a.relPath.localeCompare(b.relPath));
    expect(files.map(f => f.relPath)).toEqual(sorted.map(f => f.relPath));
  });
});
