# WebMCP Integration

## Real foundation implemented
- Runtime detection: `WEBMCP_AVAILABLE`, `WEBMCP_PARTIALLY_AVAILABLE`, `WEBMCP_UNAVAILABLE`.
- Real registration path uses `document.modelContext.registerTool(...)` when available.
- Central typed registry at `src/webmcp/registry.ts`.
- Input validation with Zod schemas in `src/webmcp/contracts.ts`.
- Structured states and explicit failure states.

## Currently implemented tools
- `get_forgemcp_status`
- `list_capabilities`
- `get_integration_status`
- `search_location` (real read-only operation)
- `find_observations` (real read-only operation)
- `inspect_position` (read-only operation + connection check)

## Not connected / not implemented
All remaining Terra/Cube contracts are intentionally explicit `NOT_CONNECTED`/`NOT_IMPLEMENTED` to avoid fake capability claims.
