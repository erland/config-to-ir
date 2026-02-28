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
