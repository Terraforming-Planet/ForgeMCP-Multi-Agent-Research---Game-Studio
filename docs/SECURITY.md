# Security

## Input validation
- Tool inputs are validated with typed schemas.
- Invalid input returns explicit structured failure states.

## Prompt injection and untrusted data
- External scientific/web responses are treated as untrusted data.
- External text is not interpreted as tool instructions.

## Authorization boundaries
- Tools are read-only by default.
- Consequential actions are modeled with human approval queue.

## Read vs write policy
- Current implemented WebMCP tools are read-only.
- Promotion/apply actions require explicit human approval state.

## Secrets and privacy
- No API keys/tokens are required for current public data sources.
- No secret values are stored in source or logs.
- Execution timeline stores safe metadata only.

## External API usage
- Nominatim (location), NASA EONET (environmental event context), Terra/Cube public app endpoints (health checks).

## Logging
- Timeline records timestamp, tool, status, duration, verification state, and errors.
- No secret fields are logged.
