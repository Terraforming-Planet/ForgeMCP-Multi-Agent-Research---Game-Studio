# WebMCP integration

`src/webmcp/detection.ts` performs real registration through `document.modelContext.registerTool(...)`, including each executable handler. `src/webmcp/registry.ts` owns bounded metadata, Zod runtime validation, structured status/error semantics and approval flags.

The README lists implemented tools and `list_capabilities` returns the runtime inventory. Terra network failures return `NOT_CONNECTED` / `INSUFFICIENT_DATA` with empty provenance. Cube uses only the pinned deterministic engine. Promotion, rollback and visual approval require literal explicit approval; visual approval never mutates upstream.
