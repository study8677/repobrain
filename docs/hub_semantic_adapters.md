# Hub Semantic Adapters

This document describes the shared semantic layer used by
`knowledge_graph.py` and `module_grouping.py`.

## Semantic IR

The semantic layer lives under `engine/antigravity_engine/hub/`:

- `semantic_index.py`
- `language_adapters/base.py`
- `language_adapters/`

The core IR is language-neutral:

- `FileSemantics`
  - file identity (`rel_path`)
  - language
  - adapter name
  - package/module identity
  - provided import keys
  - imports
  - symbol definitions
  - entrypoints
  - test relationships
  - signature summary
  - non-fatal parse error
- `SymbolDef`
  - name
  - kind
  - qualified name
  - line
  - signature
  - receiver
  - bases
  - entrypoint flag

`knowledge_graph.py` converts this IR into graph nodes and edges.
`module_grouping.py` uses the same IR for dependency grouping and hub summaries.

## Adapters

### Python

`language_adapters/python_adapter.py` supports:

- `import` and `from ... import ...`
- top-level functions
- async functions
- classes
- `if __name__ == "__main__"`-style entrypoint detection
- Python test-file detection
- legacy alias preservation used by prior grouping behavior

### Go

`language_adapters/go_adapter.py` supports:

- `package`
- single and block `import`
- top-level functions
- methods with receivers
- `struct`, `interface`, and fallback `type` declarations
- `main` and `init`
- `*_test.go`
- Go-specific signature summaries for group splitting
- nested `go.mod` module-root normalization

### Fallback

`language_adapters/generic_adapter.py` is used when a file extension is
considered source code but no dedicated adapter exists yet.

Fallback behavior:

- never raises for unsupported languages
- records adapter name as `generic`
- emits a compact line-based summary
- marks fallback files in graph diagnostics

## Diagnostics

`knowledge_graph.json` now exposes lightweight diagnostics without changing the
schema string:

- `summary.semantic_files_by_language`
- `summary.semantic_edges_by_type`
- `summary.semantic_adapters`
- `summary.generic_fallback_file_count`
- `summary.parse_error_file_count`
- `diagnostics.generic_fallback_files`
- `diagnostics.parse_error_files`

Each semantic file node is also enriched with:

- `language`
- `semantic_adapter`
- `semantic_package_identity`
- `semantic_module_name`
- `semantic_import_count`
- `semantic_symbol_count`
- `is_test_file`
- `entrypoints`
- `generic_fallback`

## Adding the Next Adapter

To add TypeScript, Rust, or Java:

1. Create `language_adapters/<language>_adapter.py`.
2. Implement the `LanguageAdapter` protocol from `base.py`.
3. Return `FileSemantics` only; do not add language-specific branching in
   `knowledge_graph.py` or `module_grouping.py`.
4. Register the adapter in `language_adapters/__init__.py`.
5. Add:
   - extraction tests
   - refresh-pipeline tests
   - grouping regression tests
   - compatibility checks if graph output changes materially

## Known limitations

- Adapters are intentionally lightweight and top-level only.
- No full type resolution or cross-package symbol resolution is attempted.
- Generic fallback summaries are coarse by design.
- The current Go adapter assumes import paths are resolved from the nearest
  `go.mod`; multi-module workspaces beyond that are not deeply modeled.
