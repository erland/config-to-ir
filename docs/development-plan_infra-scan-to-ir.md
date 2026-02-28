# Development Plan: Config-Driven Infra Scanner → IR Exporter (TypeScript CLI)

## 0. Technology Choices
- **Language/Runtime:** TypeScript on Node.js
- **Interface:** CLI command producing IR JSON artifact
- **Config Format:** YAML (human-friendly) with JSON Schema validation
- **Parsing:** text regex + `.properties` + YAML parsing
- **Testing:** unit tests + golden snapshot tests for deterministic IR output

Justification (brief):
- Best fit for a scanner/transformer run in CI/CD (fast iteration, strong ecosystem for file parsing).
- Configuration-driven rule engine is straightforward in TypeScript.
- Aligns with existing IR work and enables reuse of patterns (schema validation, deterministic output).

## 1. Starting State & Prerequisites
- Node.js LTS installed
- New repository (or folder) for the scanner tool
- The IR schema (v2) available for runtime validation

Baseline assumptions:
- Output must be deterministic for clean diffs.
- Primary usage is CLI in CI/CD; service/API can be added later if needed.

## 2. Project Structure (proposed)
- `src/cli.ts` — CLI entrypoint (args, exit codes)
- `src/config/` — config types + validation + defaults
- `src/io/` — file discovery, reading, path context extraction
- `src/parse/` — extractors: regex, properties, yaml
- `src/engine/` — rule engine producing Fact Graph (entities/relations/evidence)
- `src/ir/` — mapping Fact Graph → IR v2 + ordering + schema validation
- `src/report/` — diagnostics + optional report output
- `test/fixtures/` — sample directories and files
- `test/golden/` — expected IR outputs

## 3. Step-by-Step Implementation Plan (LLM-friendly)
Each step produces concrete deliverables and includes verification.

### Step 1 — Scaffold CLI + Config Loader
Deliverables:
- Initialize TS project, lint/test setup
- CLI accepts: `--root`, `--config`, `--out`, `--strict`
- Load YAML config file, validate basic shape, print summary

Verification:
- `npm test`
- `node dist/cli.js --help`
- Run against empty fixture directory and confirm clean exit

### Step 2 — File Discovery + Path Context Extraction
Deliverables:
- Glob include/exclude walker
- Context extractor applying configured regex rules to file paths
- Emit an internal list of `DiscoveredFile { path, relPath, context }`

Verification:
- Unit tests for include/exclude behavior
- Unit tests for context extraction regex captures

### Step 3 — Implement Extraction Primitives (Parsers)
Deliverables:
- Regex text extractor returning match objects (named capture groups)
- Properties extractor: parse key/value pairs and fetch configured keys
- YAML extractor: support key matching and a simple path selector
- Standardize outputs: `ExtractionMatch { captures, evidence }`

Verification:
- Tests for each extractor with representative fixture files
- Ensure parsing errors are reported with file path and reason

### Step 4 — Entity Rule Engine (Fact Graph: Entities)
Deliverables:
- Apply `entities[]` rules from config:
  - select files
  - run extractor(s)
  - build entity candidates
- Deterministic ID generation via `idTemplate` + transforms
- Merge policy implementation:
  - union evidence
  - tag merge strategy (configurable)
  - collision diagnostics

Verification:
- Golden test: same input yields identical entity list and IDs
- Unit test: collision + merge behavior

### Step 5 — Relationship Rule Engine (Fact Graph: Relations)
Deliverables:
- Relationship rules:
  - select source entities by type/filter
  - resolve targets by lookup strategy (by name/id template/capture)
  - apply constraints (same env/app/etc.)
  - emit relations with evidence and diagnostics for unresolved/ambiguous cases
- Deterministic ordering of relations and tie-break rules

Verification:
- Golden test: expected relations for fixture directory
- Unit tests for unresolved/ambiguous handling in strict vs permissive modes

### Step 6 — Map Fact Graph → IR v2
Deliverables:
- Mapping layer producing IR:
  - classifiers for entities (kind, stereotypes, tagged values)
  - relations for links (kind, stereotypes, tagged values)
  - optional packages (path/context-based)
  - optional stereotype definitions seeded from config
- Canonical sorting and JSON output formatting
- Runtime validation against IR schema (fail in strict mode if invalid)

Verification:
- Golden test: full IR output matches expected JSON exactly
- Schema validation test: intentionally broken output is rejected

### Step 7 — Diagnostics Report + CI/CD Friendly Output
Deliverables:
- Structured diagnostics with severity levels
- Optional `--report` output (json/text) summarizing:
  - scanned files count
  - discovered entities/relations by type
  - warnings/errors
- Exit code policy aligned with strict/permissive mode

Verification:
- Tests for exit codes under strict mode
- Snapshot test for report output formatting

### Step 8 — Documentation + Example Config Pack
Deliverables:
- `README.md` including:
  - quickstart
  - configuration reference
  - examples for JBoss CLI/properties/yaml
  - troubleshooting and common patterns
- Provide a minimal “starter config” that models:
  - domain/server-group/server
  - deployment
  - JMS queue
  - Oracle schema
  - contains/deploysTo/uses relations

Verification:
- Run README example end-to-end on fixtures:
  - `npm run build`
  - `node dist/cli.js --root test/fixtures/sample --config examples/config.yml --out out/model.ir.json`

## 4. Testing Strategy
- Unit tests: extractor correctness, template rendering, transforms, context capture, resolution logic
- Golden tests: full IR output diff-based snapshots for determinism
- Negative tests: malformed YAML, invalid properties, schema validation failures

## 5. Configuration Design (implementation notes)
- Keep config declarative: no arbitrary code execution
- Support small set of primitives:
  - file globs
  - path-context regex captures
  - regex/properties/yaml extraction
  - transforms
  - id templates
  - relation resolution strategies and constraints
- Provide a config JSON Schema and validate before execution.

## 6. Operational Guidance
- Designed to run in CI:
  - produce `model.ir.json` artifact
  - downstream converter produces XMI
- Recommend versioning:
  - config version
  - emitted `schemaVersion` in IR
- Determinism:
  - sort all collections
  - stable tie-break rules for ambiguous matches

## 7. Future Extensions (explicitly optional)
- Add more extractors (JSON, XML, HOCON)
- Add service wrapper (Quarkus or Node) for “upload/scan” workflows
- Add caching for very large repos
- Add richer semantics via stereotype properties and profiles
