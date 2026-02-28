# Example Config Pack

This directory contains example configurations and sample input trees you can run the CLI against.

## Contents

- `example-basic.yml` — minimal example that discovers a few entity types and links them with relations.
- `fixtures/basic/` — small fixture tree (CLI, properties, YAML) that matches the example config.

## Run

From repo root:

```bash
npm install
npm run build

node dist/cli.js --config docs/examples/example-basic.yml --root docs/examples/fixtures/basic --out out/example-basic.ir.json --report out/example-basic.report.json
```

If you want CI-like behavior (warnings fail the build):

```bash
node dist/cli.js --config docs/examples/example-basic.yml --root docs/examples/fixtures/basic --out out/example-basic.ir.json --report out/example-basic.report.json --strict
```
