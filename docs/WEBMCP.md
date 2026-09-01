# WebMCP integration

`src/webmcp/detection.ts` performs real registration through `document.modelContext.registerTool(...)`, including each executable handler. `src/webmcp/registry.ts` owns bounded metadata, Zod runtime validation, structured status/error semantics and approval flags.

The README lists implemented tools and `list_capabilities` returns the runtime inventory. Terra network failures return `NOT_CONNECTED` / `INSUFFICIENT_DATA` with empty provenance. Cube uses only the pinned deterministic engine. Promotion, rollback and visual approval require literal explicit approval; visual approval never mutates upstream.

LabMCP adds six bounded Terra handlers: `inspect_test_001_evidence`, `resolve_reference_dataset`, `find_global_water_analogues`, `inspect_local_hydrology_context`, `run_labmcp_test_001`, and `inspect_hazard_signals`. Their concrete input and envelope-output schemas are registered on every route, registration is idempotent for one browser model context, and the page invokes the same handler exposed to WebMCP rather than a parallel UI-only implementation.
