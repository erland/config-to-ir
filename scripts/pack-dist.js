const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function mkdirp(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copy(src, dst) {
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    mkdirp(dst);
    for (const name of fs.readdirSync(src)) {
      copy(path.join(src, name), path.join(dst, name));
    }
    return;
  }
  mkdirp(path.dirname(dst));
  fs.copyFileSync(src, dst);
}

function writeBuildInfo(outDir) {
  const sha = process.env.GITHUB_SHA || "unknown";
  const ref = process.env.GITHUB_REF || "unknown";
  const runId = process.env.GITHUB_RUN_ID || "unknown";
  const builtAt = new Date().toISOString();

  const info = { sha, ref, runId, builtAt };
  fs.writeFileSync(path.join(outDir, "BUILD_INFO.json"), JSON.stringify(info, null, 2) + "\n", "utf-8");
}

function main() {
  const outRoot = path.resolve("out");
  const pkgDir = path.join(outRoot, "pkg");
  rmrf(pkgDir);
  mkdirp(pkgDir);

  if (!fs.existsSync("dist")) {
    throw new Error("dist/ not found. Run `npm run build` first.");
  }

  copy("dist", path.join(pkgDir, "dist"));
  if (fs.existsSync("docs")) copy("docs", path.join(pkgDir, "docs"));

  for (const f of ["package.json", "README.md", "LICENSE"]) {
    if (fs.existsSync(f)) copy(f, path.join(pkgDir, f));
  }

  writeBuildInfo(pkgDir);

  const zipPath = path.join(outRoot, "config-to-ir.zip");
  if (fs.existsSync(zipPath)) fs.rmSync(zipPath, { force: true });

  execSync(`cd "${pkgDir}" && zip -r "${zipPath}" .`, { stdio: "inherit" });
  console.log(`Wrote ${zipPath}`);
}

main();
