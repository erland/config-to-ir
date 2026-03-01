import path from "node:path";
import fs from "node:fs";

export function ensureParentDir(filePath: string) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

export function writeJson(filePath: string, value: unknown) {
  ensureParentDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf-8");
}

export function writeText(filePath: string, value: string) {
  ensureParentDir(filePath);
  fs.writeFileSync(filePath, value, "utf-8");
}
