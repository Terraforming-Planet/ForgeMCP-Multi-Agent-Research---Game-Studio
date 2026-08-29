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
- Most tools are read-only or browser-local. Candidate promotion, rollback and visual approval require a literal explicit human approval input.
- Candidate promotion also requires executed benchmark and legality/regression gates. Baseline state is retained for rollback.

## Secrets and privacy
- No API keys/tokens are required for current public data sources.
- No secret values are stored in source or logs.
- Execution timeline stores safe metadata only.

## External API usage
- Nominatim (location), NASA EONET (event context), Open-Meteo/Copernicus DEM (elevation), and public Terra/Cube app health checks.

## Logging
- Timeline records timestamp, tool, status, duration, verification state, and errors.
- No secret fields are logged.
