# Codex task — ForgeMCP end-to-end WebMCP challenge pass

You are working in the public open-source repository **ForgeMCP — Multi-Agent Research & Game Studio** for the OpenAI WebMCP Challenge 2026.

## Mission

Do not build a chatbot and do not replace existing source-of-truth systems. Upgrade the current ForgeMCP foundation into a judge-ready, demonstrable, end-to-end WebMCP application with three visible human+agent workflows:

1. **OBSERVE THE REAL WORLD — Terra**
2. **LEARN & COMPETE — Cube Chess 512 self-play**
3. **CREATE — Cube visual-readability proposal + QA**

The core architecture must remain:

`HUMAN → FORGEMCP COORDINATOR → SPECIALIST AGENTS → WEBMCP TOOLS → REAL APP / REAL DATA / GAME ENGINE → VERIFICATION → RESULT → HUMAN DECISION`

Agents are not the source of truth.

- Terra truth = real/public data, measurements, provenance and deterministic analysis.
- Cube truth = deterministic 8×8×8 rules engine and executed legal games/tests.

## Non-negotiable truth and safety rules

- Never fabricate satellite observations, hazard causes, tournament games, benchmark results, Elo, AI improvement, test results, or external connectivity.
- If a source/tool is unavailable, return a structured `INSUFFICIENT_DATA`, `NOT_CONNECTED`, or `NOT_IMPLEMENTED` result instead of inventing success.
- Mutating/promotional actions require explicit human approval.
- Do not commit API keys, tokens, passwords, `.env`, credentials or private data.
- Do not create a hidden authority path that bypasses verification.
- Preserve all existing working behavior and tests.

## Challenge implementation requirement

Use real WebMCP registration in the browser via the existing `document.modelContext.registerTool(...)` path. Tools must have:

- one clear responsibility,
- validated input,
- structured output,
- bounded permissions,
- explicit provenance,
- clear status/error semantics,
- tests.

The dashboard must visibly expose for every workflow:

- HUMAN REQUEST
- COORDINATOR
- ACTIVE AGENTS
- WEBMCP TOOLS
- REAL DATA / ENGINE SOURCE
- FINDINGS
- PROPOSED ACTION
- CONFIDENCE
- UNCERTAINTY
- VERIFICATION
- PASS / WARNING / FAIL
- PROVENANCE
- HUMAN APPROVAL when mutation/promotion is possible

## Phase A — inspect before coding

1. Audit the current repository completely.
2. Preserve existing architecture where reasonable; improve rather than rewrite blindly.
3. Inspect the public Terra source and live application:
   - https://github.com/Terraforming-Planet/Polar-Sun-Moon-Analysis
   - https://terraforming-planet.github.io/Polar-Sun-Moon-Analysis/
4. Inspect the public Cube source and live application:
   - https://github.com/teslaeco/Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer
   - https://teslaeco.github.io/Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer/
5. Identify exact stable functions/data/routes that can be called or safely adapted. Prefer direct reuse of authoritative code/data over reimplementation.
6. Record any pinned upstream commit SHA used for an adapter or vendored deterministic module.

## Phase B — Terra end-to-end workflow

Implement the strongest truthful Terra workflow possible from the browser without secrets.

At minimum expose and wire real WebMCP tools covering:

- `search_location`
- `set_area_of_interest`
- `create_research_station`
- `set_station_timespan`
- `find_observations`
- `compare_dates` or `compare_seasons`
- at least one water/terrain inspection tool such as `inspect_lake`, `inspect_water`, `inspect_terrain`, or `get_elevation_profile`
- `verify_evidence`
- `generate_research_report`

The existing real OpenStreetMap/Nominatim and NASA EONET integrations must remain truthful and may be expanded.

Create a real demonstrable flow for a request such as:

> “Investigate this area and assess potential environmental risk.”

The Coordinator should visibly route through specialist roles such as Source Scout, EO Analyst, Terrain/Hydrology and Evidence Verifier.

Scientific classifications are restricted to:

- `OBSERVATION`
- `ANOMALY`
- `HYPOTHESIS`
- `PRELIMINARY_RISK_ALERT`
- `VERIFIED_FINDING`
- `INSUFFICIENT_DATA`

A preliminary alert must include:

- place / AOI,
- time range,
- source(s),
- observed indicators,
- confidence,
- uncertainty,
- required ground/in-situ verification.

Do **not** claim a cause is satellite-confirmed unless the source actually establishes it.

If the live Terra app exposes callable deterministic functions, reuse them. If browser cross-origin constraints prevent direct calls, build a transparent adapter with exact upstream provenance and clearly document the limitation. Do not silently mock Terra.

## Phase C — Cube Computer-vs-Computer Training Lab

This is the highest-priority missing feature.

Implement a **real deterministic self-play/benchmark path** using the actual Cube Chess 8×8×8 rules engine or a pinned authoritative engine adapter from the Cube repository.

Expose WebMCP tools such as:

- `create_ai_candidate`
- `start_selfplay`
- `run_ai_tournament`
- `inspect_game`
- `analyze_blunders`
- `compare_ai_versions`
- `tune_policy`
- `evaluate_candidate`
- `promote_ai_candidate`
- `rollback_ai_candidate`

The first judge-ready version may use a deliberately small number of games so it executes reliably in-browser/CI, but every reported game must have actually executed legally.

Required benchmark methodology:

- baseline opponent vs candidate opponent,
- identical conditions,
- deterministic seeds/openings,
- side/color swap where applicable,
- W/D/L,
- illegal move count,
- blunder/material-loss proxy based on deterministic evaluation,
- mate/checkmate performance if present,
- search nodes if engine exposes them,
- move time,
- move/position diversity,
- clearly documented Elo-like metric only if actually computed from stated methodology; otherwise omit Elo entirely.

Save per-game records containing at least:

- game id,
- seed/opening identifier,
- side assignment,
- legal move list or replayable move records,
- result / termination reason,
- benchmark metrics,
- engine/policy version.

Candidate promotion must be gated. `promote_ai_candidate` must not silently promote. Require:

1. benchmark threshold PASS,
2. legality/regression PASS,
3. explicit human approval.

`rollback_ai_candidate` must be reversible and must never destroy the baseline.

Important historical wording:

- Existing PR #101 performed 100K virtual policy-tuning games.
- Existing PR #102 performed 3K legal policy runs.
- Do not call those neural-network training.
- Do not reuse those historical numbers as if the new ForgeMCP tournament executed them.

For the new ForgeMCP demo, report only the number of games actually executed by the new workflow.

## Phase D — Game Creation / Visual Agent workflow

Implement a safe judge-visible workflow for:

> “Improve the game’s visual readability.”

The Visual Agent should analyze deterministic/current configuration or screenshots/metadata available to ForgeMCP and produce a structured proposal covering relevant items such as:

- board level readability,
- camera,
- contrast,
- lighting/materials,
- selected-square / legal-move readability,
- mobile readability,
- accessibility.

The flow must show:

`analysis → proposed change → BEFORE/AFTER representation → QA → PASS/WARNING/FAIL → human approval`

Do not automatically overwrite the live Cube game. A proposal can be represented through a reversible preview/configuration diff if direct visual modification is not safely available. Label previews honestly.

Add WebMCP tools with bounded semantics such as:

- `analyze_visual_readability`
- `propose_visual_change`
- `preview_visual_change`
- `run_visual_qa`
- `approve_visual_change`
- `reject_visual_change`

Only implement names that make sense in the current codebase, but ensure the end-to-end workflow exists.

## Phase E — Coordinator and visible orchestration

Create a deterministic Coordinator that accepts a human request and chooses a workflow based on intent without pretending an LLM call occurred if none occurred.

The UI must visibly animate or step through actual execution states rather than merely showing static marketing copy.

Each run should generate a structured timeline/event log with:

- timestamp/order,
- coordinator decision,
- specialist agent,
- tool call,
- input summary,
- output status,
- source/provenance,
- verification status.

Provide at least three one-click demo scenarios matching Terra, Cube self-play, and Cube visual QA.

## Phase F — WebMCP correctness and testing

- Keep real `document.modelContext.registerTool(...)` usage.
- Gracefully detect unsupported browsers and show judge instructions rather than crashing.
- Validate all schemas with zod or equivalent existing validation.
- Add unit/integration tests for tool registration, coordinator routing, scientific classification, provenance, self-play legality, benchmark aggregation, promotion gating, rollback, visual approval gating.
- Add at least one test proving fabricated success is impossible when an upstream dependency fails.
- Keep CI green: `npm ci`, `npm run typecheck`, `npm test`, `npm run build` and lint if configured.

## Phase G — deployment and challenge docs

Prepare the repo for a simple public static deployment (prefer GitHub Pages if compatible with the current Vite app; do not add a paid or unnecessary backend).

Update README and challenge docs to clearly state:

- what existed before the challenge,
- what ForgeMCP added during the challenge,
- why WebMCP is needed,
- what a human and agent can do together that was previously harder,
- exact implemented tools,
- exact `NOT_CONNECTED` / limitations,
- run instructions,
- judge testing instructions,
- security/trust boundaries,
- public Terra and Cube URLs,
- demo script under 3 minutes.

Do not mark a checklist item complete unless it is actually complete.

## Acceptance criteria

The task is complete only if all of the following are true:

1. Build passes.
2. Typecheck passes.
3. Tests pass.
4. Real WebMCP tools are registered.
5. Terra demo performs at least one real external observation/data lookup with provenance and scientific uncertainty.
6. Cube self-play executes actual legal games through the authoritative/pinned deterministic rules path and reports only real executed counts.
7. Candidate cannot be promoted without benchmark + tests + human approval.
8. Visual workflow produces a reversible proposal/preview and QA result; it does not silently mutate the live game.
9. Dashboard visibly shows coordinator, agents, tools, source, verification and result.
10. Documentation truthfully distinguishes implemented capabilities from limitations.
11. No secrets are committed.
12. The resulting branch is ready for code review and PR, with a concise summary of files changed, tests run, limitations, and recommended next step.

## Work style

Make implementation decisions autonomously. Do not stop after writing plans or TODOs. Inspect, implement, test, fix failures, and leave the branch in a reviewable state. Prefer a smaller real end-to-end implementation over a large simulated one.

At the end, print a concise report containing:

- implemented workflows,
- real WebMCP tools added/updated,
- real data/engine integrations,
- exact self-play game count executed by tests/demo if any,
- tests/build status,
- remaining honest limitations,
- files changed.
