# ForgeMCP

## Multi-Agent Research & Game Studio

**Observe the Real World. Learn & Compete. Create. Verify.**

ForgeMCP connects humans and specialized AI agents through real WebMCP tools to Terra Observation System and Cube Chess 512.

## WebMCP Challenge 2026

- **Live Demo:** TODO (public URL required)
- **Public Repository:** https://github.com/Terraforming-Planet/ForgeMCP-Multi-Agent-Research---Game-Studio

### Why WebMCP?
WebMCP turns these systems from apps agents can only describe into systems agents can safely operate through structured tools, validation, provenance, verification, and human approval.

### Human + Agent Collaboration
- Human provides request and final decisions.
- Coordinator orchestrates specialist agents.
- Agents execute tool operations and produce structured results.
- Verification and provenance remain explicit.

### Sources of Truth
- **Terra:** real data + provenance + verification requirements.
- **Cube:** deterministic rules engine + executed experiments + measured metrics.

## Architecture

HUMAN → COORDINATOR → SPECIALIST AGENTS → WEBMCP TOOLS → REAL SOURCE → VERIFICATION → HUMAN DECISION

## Implemented Now
- Responsive dashboard and execution timeline.
- Typed workflow, evidence, verification, station, experiment, and promotion models.
- Typed agent registry and WebMCP tool registry.
- Runtime WebMCP detection and registration via `document.modelContext.registerTool(...)` when available.
- Terra read-only operations:
  - `search_location` (OpenStreetMap Nominatim)
  - `find_observations` (NASA EONET)
- Cube read-only operation:
  - `inspect_position` (coordinate validation + cube endpoint health check)
- Human approval queue (approve/reject actions).
- Provenance viewer and JSON export.
- CI workflow: lint, typecheck, test, build.

## Explicitly Not Connected / Not Implemented
Many Terra/Cube contract tools are registered as explicit `NOT_CONNECTED` + `NOT_IMPLEMENTED` placeholders and are labeled as such in the Tool Inspector and docs.

## Pages
Home, Dashboard, Terra Research, Research Stations, Hazard Intelligence, Cube AI Lab, Self-Play Lab, Game Creation Studio, WebMCP Tools, Verification, Provenance, Challenge Evidence, Architecture, Documentation, About, Exports, Integration Status, Human Approval.

## Testing
```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

## Deployment
Vite app is configured with `base: './'` for static hosting compatibility (including GitHub Pages style deployments).

## Challenge Work Documentation
See:
- `docs/WEBMCP.md`
- `docs/CHALLENGE_WORK.md`
- `docs/SECURITY.md`
- `docs/DATA_SOURCES.md`
- `docs/JUDGE_TESTING.md`
- `docs/LIMITATIONS.md`
- `docs/SUBMISSION_CHECKLIST.md`
- `docs/DEMO_SCRIPT.md`

## License
MIT (`LICENSE`)
