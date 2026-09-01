# ForgeMCP — Multi-Agent Research & Game Studio

Judge-ready browser application for the OpenAI WebMCP Challenge 2026:

`HUMAN → COORDINATOR → SPECIALIST AGENTS → WEBMCP TOOLS → REAL DATA / ENGINE → VERIFICATION → HUMAN DECISION`

It is not a chatbot. The coordinator is deterministic and never claims an LLM ran. Terra findings come from public providers; Cube results come from executed legal games.

## Three workflows

- **OBSERVE — Terra:** Nominatim place lookup, bounded AOI/station, NASA EONET context, Copernicus DEM samples through Open-Meteo, provenance, uncertainty, and evidence verification. Empty or failed providers return `INSUFFICIENT_DATA` / `NOT_CONNECTED`.
- **LabMCP — Terra TEST 001:** live retrieval of the recorded forest-pond measurement, a non-substituting Toruń reference resolver, deterministic selection of 12–16 context-only analogues from the public global hydrology casebooks, competing hypotheses, provenance and a ground-verification gate. The result remains `HYPOTHESIS / QA WARNING`; no current cause or hazard level is claimed.
- **LEARN & COMPETE — Cube:** a pinned authoritative 8×8×8 engine executes four small candidate-v-baseline games with paired seeds and side swaps. Records contain replayable moves, results, termination, legality, deterministic material proxy and engine version. No Elo is claimed.
- **CREATE — Visual QA:** current configuration analysis, reversible before/after preview, deterministic QA, and approval/rejection. Approval records a decision but never overwrites the live Cube application.

## WebMCP tools

The browser registers real handlers using `document.modelContext.registerTool(...)`. Implemented tools:

`get_forgemcp_status`, `list_capabilities`, `get_integration_status`, `search_location`, `set_area_of_interest`, `create_research_station`, `set_station_timespan`, `find_observations`, `compare_dates`, `get_elevation_profile`, `inspect_test_001_evidence`, `resolve_reference_dataset`, `find_global_water_analogues`, `inspect_local_hydrology_context`, `run_labmcp_test_001`, `inspect_hazard_signals`, `verify_evidence`, `generate_research_report`, `create_ai_candidate`, `start_selfplay`, `run_ai_tournament`, `inspect_game`, `analyze_blunders`, `evaluate_candidate`, `promote_ai_candidate`, `rollback_ai_candidate`, `analyze_visual_readability`, `propose_visual_change`, `preview_visual_change`, `run_visual_qa`, `approve_visual_change`, `reject_visual_change`.

Unsupported browsers show `WEBMCP_UNAVAILABLE`; the dashboard itself still works. Mutating/promotion tools validate inputs, return structured status, and promotion/rollback require literal `humanApproved: true` plus applicable automated gates.

## Truth and provenance

- Terra upstream: [source](https://github.com/Terraforming-Planet/Polar-Sun-Moon-Analysis) and [live app](https://terraforming-planet.github.io/Polar-Sun-Moon-Analysis/), audited at `fd47cbf1137b1094e932b6657cbb4af4de9373d7`.
- Cube upstream: [source](https://github.com/teslaeco/Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer) and [live app](https://teslaeco.github.io/Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer/). The vendored deterministic engine is pinned to `9543accfcef8f8786c32aed282aa63e49ad27615`.

Existing PR #101's 100K virtual policy-tuning games and PR #102's 3K legal policy runs are historical upstream work, not neural-network training and not ForgeMCP execution. ForgeMCP reports only games executed in the current run.

## Run and verify

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run dev
```

Open `/#/dashboard` and use the one-click demos, or open `/#/labmcp` for TEST 001. Vite uses a relative base and a hash router, and the Pages workflow publishes the static `dist/` build after changes reach `main`.

## Trust boundaries and limitations

Public network access and provider CORS/availability are required for live Terra calls. EONET events provide contextual observations, not causes; DEM values are raster samples, not surveyed heights. No direct Terra application mutation, live Cube overwrite, rendered screenshot QA, remote AI service, or neural training is implemented. Candidate state is browser-memory demo state, not a production model registry.

See [LabMCP TEST 001](docs/LABMCP_TEST_001.md), [judge testing](docs/JUDGE_TESTING.md), [demo script](docs/DEMO_SCRIPT.md), [limitations](docs/LIMITATIONS.md), [security](docs/SECURITY.md), and [challenge changes](docs/CHALLENGE_WORK.md).

## Before vs challenge work

Terra and Cube existed independently before the challenge. ForgeMCP added the browser coordinator, WebMCP execution contracts, public-data adapters, pinned engine adapter and executed benchmark, verification/event timeline, reversible visual proposal, approval gates, and tests. Agents coordinate operations; they never become the authority.

MIT licensed.
