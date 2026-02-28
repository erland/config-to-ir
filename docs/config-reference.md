# Config Reference (Steps 1-7)

This is a practical reference for the current config file schema implemented so far.

## Top-level

- `version` (number, required)
- `inputs` (object, required)
- `context` (object, optional)
- `entities` (array, optional)
- `relations` (array, optional)

## inputs

```yaml
inputs:
  root: "."              # string, default "."
  include: ["**/*.yml"]   # array of glob patterns, required (>=1)
  exclude: ["**/target/**"] # array of globs, default []
```

Globs are evaluated relative to `--root` (CLI argument), not `inputs.root`. (`inputs.root` is reserved for later steps.)

## context.fromPath

Defines rules that extract context variables from the relative path of a discovered file.

```yaml
context:
  fromPath:
    - name: env
      regex: "/(dev|prod)/"
```

Notes:
- The engine tries matching the regex against: `relPath`, `/${relPath}`, and `/${relPath}/` for convenience.
- Captures:
  - named groups are supported: `(?<env>dev|prod)`
  - otherwise first capture group is used.

## entities (EntityRule)

```yaml
entities:
  - type: OracleSchema
    idTemplate: "oracle:schema:${match.schema}:${ctx.env}"
    nameTemplate: "${match.schema}"          # optional
    classifierKind: "CLASS"                  # optional
    stereotypeId: "stereotype:foo"           # optional
    tags:                                    # optional map of template strings
      env: "${ctx.env}"
      app: "${ctx.app}"
    extract:                                 # required (>=1)
      - type: properties
        file: "**/*.properties"
        keys: ["datasource.schema"]
        captureName: "schema"
```

### Templates
Templates support:
- `${ctx.<key>}` from path context
- `${match.<capture>}` from extractor captures

### extract primitives
Supported (Step 3+):
- `regex`:
  - `file`, `pattern`, optional `flags`, optional `pickCaptures`
- `properties`:
  - `file`, `keys`, optional `captureName`, optional `emitMissing`
- `yaml`:
  - `file`, optional `selectPath`, optional `keys`, optional `captureName`, optional `emitMissing`

### merge
Optional merge policy:

```yaml
merge:
  tagMerge: keep-first     # keep-first | overwrite
  warnOnNameMismatch: true
```

## relations (RelationRule)

```yaml
relations:
  - name: schema_uses_index
    kind: DEPENDENCY
    from:
      entityType: OracleSchema
    to:
      entityType: ElasticIndex
      resolve:
        by: id            # id | name | tag
        template: "elastic:index:${from.tags.app}-index:${from.tags.env}"
      # for by: tag, also provide: tagKey: "env"
    constraints:
      sameTags: ["env","app"]
    onUnresolved: warn      # ignore | warn | error
    onAmbiguous: warn-pick-first # pick-first | warn-pick-first | error
```

### Relation templates
Relation templates support:
- `${from.id}`, `${from.name}`, `${from.type}`
- `${from.tags.<key>}`

## Reports & exit codes

- `--report <path>` writes a report (json/text)
- `--reportFormat json|text` selects format
- Exit code:
  - `0` success (no errors; warnings allowed unless `--strict`)
  - `2` if any errors, or if `--strict` and warnings exist
