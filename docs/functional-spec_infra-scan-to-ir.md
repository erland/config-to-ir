# Functional Specification: Config-Driven Infra Config Scanner → UML IR Exporter

## 1. Purpose
Create a tool that scans a directory tree containing configuration files (e.g., JBoss/WildFly CLI scripts, `.properties`, `.yml/.yaml`) and, using a user-provided configuration, extracts infrastructure/application concepts as UML-like elements and relationships. The tool outputs an **IR JSON file** compatible with an existing downstream converter that produces XMI for import into UML tools.

## 2. Goals
- Convert configuration-as-code artifacts into a navigable, model-like representation.
- Keep **what to parse** and **how to map** fully **configurable via a text file**.
- Produce deterministic, repeatable IR output to support CI/CD and meaningful diffs.

## 3. Non-Goals
- Not responsible for converting IR to XMI (already exists).
- Not responsible for deploying or validating JBoss domains/servers; only models what is described.
- Not a generic programming language for parsing; configuration remains declarative.

## 4. Actors
- **Config Author**: Maintains extraction/mapping configuration.
- **CI/CD Pipeline**: Runs the tool on repository contents to generate IR artifacts.
- **Architect/Engineer**: Imports XMI (converted from IR) into UML tooling for analysis.

## 5. Inputs
### 5.1 Directory Tree
A root directory containing:
- Text configuration files: `.cli`, `.properties`, `.yml`, `.yaml`, optionally others.
- Paths may encode environment/app/host or other context via naming conventions.

### 5.2 Tool Configuration (Text File)
A single configuration file (e.g., YAML or JSON) defining:
- File inclusion/exclusion patterns
- Context extraction from file paths
- Parsing/extraction rules for entities and relationships
- Normalization rules and deterministic ID templates
- Packaging/grouping rules for produced model structure
- Diagnostics/warnings policies

### 5.3 Optional Runtime Parameters
- Root directory to scan
- Path to configuration file
- Output path for IR JSON
- Optional mode toggles (e.g., strictness, report output)

## 6. Outputs
### 6.1 IR JSON File
- A JSON document in the required IR format, containing at minimum:
  - classifiers (UML-like elements)
  - relations (links between classifiers)
  - optional packages
  - optional stereotype definitions/references
- Deterministic ordering (stable output across runs given same inputs).

### 6.2 Optional Report (Machine/Human Readable)
- Summary of:
  - files scanned
  - entities discovered
  - relations created
  - warnings/errors (collisions, unresolved references, ambiguous matches)
- Designed for CI logs and troubleshooting.

## 7. Core Concepts
### 7.1 Entity
A discovered item representing something to model, such as:
- JBoss domain, server-group, server instance, deployment
- JMS queue/topic
- Elastic index
- Oracle schema/user
- Ceph bucket
- AD group
Each entity has:
- a **type** (domain-specific category)
- a **name** (human readable)
- a deterministic **id**
- optional attributes/tags derived from file content and/or path context

### 7.2 Relationship
A directed link between two entities (or between entity and container), such as:
- contains (domain → server-group → server)
- deploysTo (deployment → server)
- uses/dependsOn (app/deployment/server → queue/schema/index/bucket)
- memberOf (user/service → AD group)
Relationships have:
- a **kind** (mapped to the IR relation kind set)
- optional stereotypes/tags for semantics

### 7.3 Context
Metadata derived from file path and/or file contents, e.g.:
- environment (dev/test/prod)
- application/system identifier
- host/machine group
- region/site
Context is used to:
- disambiguate identities (same queue name in different envs)
- constrain relationship rules (link only within same env/app)
- create packages/grouping

## 8. Functional Requirements
### 8.1 File Discovery
- Tool SHALL recursively scan a root directory.
- Tool SHALL support include/exclude patterns (glob-style).
- Tool SHALL ignore binary files by default and only process text files matching configured patterns.

### 8.2 Path-Based Context Extraction
- Tool SHALL support extracting context values from file paths using configured patterns (e.g., regex capture groups).
- Tool SHALL attach extracted context to all matches found within the file.
- Tool SHOULD allow multiple context rules; later rules may refine/override earlier ones per config.

### 8.3 Parsing & Extraction
The tool SHALL support multiple extractor types configured per rule:
- **Regex extractor** over raw text (for `.cli` and general cases)
- **Properties extractor** for key/value files (`.properties`-like semantics)
- **YAML extractor** for `.yml/.yaml` (path-based selection and/or key matching)

For each entity rule, the tool SHALL:
- identify candidate files based on configured file patterns
- apply extraction method(s) to generate zero or more matches
- create or merge entities based on deterministic identity rules

### 8.4 Normalization & Deterministic Identity
- Tool SHALL allow configuration of an **id template** for each entity type, using captured values + context.
- Tool SHALL provide normalization transforms (trim, lower/upper, replace, split/join, regex-substitute).
- Tool SHALL produce stable IDs across runs for same inputs.
- Tool SHALL define merge behavior when multiple matches produce same ID.

### 8.5 Entity Mapping to UML-like Classifiers
- Tool SHALL map each entity to a classifier with:
  - `id`, `name`, `kind`
  - optional stereotypes
  - optional tagged values/attributes (evidence, env, app, host, source file, key names, etc.)
- Tool SHALL allow mapping configuration per entity type (kind, stereotype, tags to emit).

### 8.6 Relationship Discovery
- Tool SHALL support relationship rules that:
  - select source entities by type and optional filters
  - select target entities by type and resolution strategy (by ID template, by name lookup, by captured reference in file evidence)
  - apply constraints (e.g., same env/app)
  - emit one or more relations with configured kind + stereotypes + tags
- Tool SHALL support **containment** relationships (used to build hierarchical structure).

### 8.7 Packaging / Grouping
- Tool SHOULD support creating logical packages based on:
  - path context (env/app)
  - explicit configuration mapping (e.g., app → package)
- Tool SHALL place classifiers into packages deterministically when packaging is enabled.

### 8.8 Evidence & Traceability
- Tool SHALL record evidence for each entity and relation:
  - at minimum, source file path
  - optionally: line number / key name / matched text snippet (within safe limits)
- Evidence SHOULD be configurable to avoid leaking sensitive values.

### 8.9 Validation & Diagnostics
- Tool SHALL validate the configuration file against a config schema.
- Tool SHALL provide diagnostics for:
  - invalid config
  - parse errors (malformed YAML/properties)
  - ID collisions and merge outcomes
  - unresolved relationship targets
  - ambiguous matches (multiple candidates)
- Tool SHALL support strict and permissive modes:
  - **strict**: fail with non-zero exit code on configured diagnostic severity
  - **permissive**: produce IR but emit warnings

### 8.10 Deterministic Output
- Tool SHALL emit IR with:
  - stable ordering of packages, classifiers, relations
  - stable formatting (e.g., canonical JSON formatting)
- Tool SHALL support an option to pretty-print or minify, without changing semantic ordering.

### 8.11 CLI/Integration
- Tool SHALL be runnable as a command in CI:
  - input root
  - config path
  - output path
- Tool SHALL exit with:
  - 0 on success (or permissive success with warnings)
  - non-zero on failure (config invalid, strict violations, IO errors)

## 9. Edge Cases & Rules
- If two different discoveries generate the same entity ID:
  - merge tags by configured policy (e.g., union vs overwrite)
  - append evidence list
  - optionally raise collision warning/error depending on policy
- If a relationship cannot resolve its target:
  - emit warning/error per config
  - optionally create a placeholder “Unknown” entity only if explicitly enabled
- If multiple targets match:
  - choose deterministic tie-breaker (e.g., highest rule priority, lexical ID)
  - emit ambiguity warning/error

## 10. Security & Privacy Considerations
- Tool SHALL allow redacting sensitive tag values (e.g., schema passwords, secrets).
- Tool SHOULD avoid storing raw matched text unless configured.
- Tool SHALL not execute any scripts; it only reads files.

## 11. Non-Functional Requirements
- Performance: handle typical monorepo-scale config trees efficiently (streaming reads where feasible).
- Reliability: robust error handling, clear diagnostics, deterministic outputs.
- Maintainability: small set of extraction primitives; configuration remains declarative.
- Testability: golden snapshot tests for deterministic output.

## 12. Assumptions & Dependencies
- Repository contains primarily text configuration files.
- Naming conventions in paths and keys are reasonably stable and can be captured with regex/path rules.
- IR schema version and required fields are stable and validated at runtime before writing output.
