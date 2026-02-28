# config-to-ir

A config-driven scanner that will turn infrastructure/app configuration (JBoss CLI, properties, YAML, etc.) into an **IR JSON** model that can later be converted to XMI and imported into UML tools.

## Current status
This repository implements **Step 1: Scaffold CLI + Config Loader**:
- CLI argument parsing
- YAML config loading
- Basic config validation
- Summary output

## Quick start

```bash
npm install
npm run build
node dist/cli.js --config examples/config.yml --root . --out out/model.ir.json
```

## CLI

```bash
config-to-ir --config <path> --root <dir> --out <path> [--strict]
```

Notes:
- Step 1 does **not** generate IR yet. It validates config and prints a summary.
- The IR schema is included under `schemas/ir/`.

## Docs
See `docs/` for:
- Functional specification
- Development plan

## Implemented steps
- Step 1: CLI + config loader
- Step 2: File discovery + path context extraction
- Step 3: Extraction primitives (regex, properties, YAML)

- Step 4: Entity rule engine (build fact-graph entities)
- Step 5: Relationship rule engine (build fact-graph relations)
- Step 6: Map fact graph to IR v2 + validate against schema


## Reports (Step 7)
You can optionally write a diagnostics report:

```bash
node dist/cli.js --config examples/config.yml --root . --out out/model.ir.json --report out/report.json --reportFormat json
node dist/cli.js --config examples/config.yml --root . --out out/model.ir.json --report out/report.txt --reportFormat text
```

Exit codes:
- `0` success (no errors; warnings allowed unless `--strict`)
- `2` if any errors, or if `--strict` and warnings exist


## Documentation
- Config reference: `docs/config-reference.md`
- Example config pack: `docs/examples/`

Quick example:

```bash
node dist/cli.js --config docs/examples/example-basic.yml --root docs/examples/fixtures/basic --out out/example-basic.ir.json --report out/example-basic.report.json
```


## CI/CD (Snapshot + Releases)

This repo publishes:
- **Snapshot** build on every push to `main` (GitHub Release tag: `snapshot`, prerelease)
- **Versioned releases** only when you push a tag like `v1.2.3` (GitHub Release `v1.2.3`, marked as latest)

The build artifact is a zip containing:
- `dist/` (compiled CLI)
- `docs/` (including IR schema + example pack)
- `BUILD_INFO.json` (commit SHA, ref, run id, build timestamp)

### Create a versioned release
```bash
git tag v0.1.0
git push origin v0.1.0
```
