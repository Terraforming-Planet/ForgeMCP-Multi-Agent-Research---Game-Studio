# Codex task — full history audit of Terra + Cube for WebMCP Challenge

You are working in ForgeMCP. This is a research/audit pass before the next implementation pass. Do NOT rebuild Terra Observation System or Cube Chess 512. The owner explicitly wants us to discover and reuse everything already built across both repositories from their beginning, including every pull request, not just recent PRs.

## Repositories to audit

1. Terra Observation System
   - https://github.com/Terraforming-Planet/Polar-Sun-Moon-Analysis
   - live: https://terraforming-planet.github.io/Polar-Sun-Moon-Analysis/

2. Cube Chess 512 AI Open Source
   - https://github.com/teslaeco/Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer
   - live: https://teslaeco.github.io/Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer/

3. ForgeMCP current repo is the integration/coordinator layer.

## Non-negotiable audit rule

Enumerate ALL pull requests in both Terra and Cube from PR #1 through the latest PR by using the GitHub REST API with pagination (`/pulls?state=all&per_page=100&page=N`) and, when needed, individual PR metadata/changed files. Do not stop at the most recent 100 PRs. Record PR number, title, merged/open/closed state, date, and capability category. Superseded/unmerged PRs must be distinguished from capabilities actually merged into `main`.

Also inspect current `main` trees/readmes/key source modules in both repos so a historical PR is not treated as current functionality if it was later removed or replaced.

## Produce these files in ForgeMCP

### `docs/AUDIT_TERRA_FULL_HISTORY.md`
A complete capability audit grouped by evolution rather than a flat PR dump. Include a compact appendix/table covering every Terra PR number. Identify what exists now in `main`, what is historical/superseded, and what is still open/experimental.

At minimum verify and map current reusable Terra capabilities around:
- 3D Earth / Cesium / WGS84 / timeline/time selector;
- NASA GIBS, NASA/NOAA, ESA/Copernicus/CDSE, USGS/Landsat, Sentinel-1 SAR, Sentinel-2, DEM, SWOT/SMAP/GRACE where actually present;
- global place search / AOI / scales / date ranges / seasons / exact UTC;
- yearly/historical imagery and cloud-minimized scene selection;
- Terrain Laboratory, numbered flags, DEM samples, elevation profiles, hydrology/river direction;
- lakes, rivers, wetlands, surface water, coast/ocean, Arctic, Sahara/drylands/paleochannels;
- Sahara DEM + Priority-Flood + D8 + before/after hypothetical terrain scenarios;
- Ocean Research Station / bathymetry / 512-cell workspace;
- Earth–Space 512 / SOHO / eclipse/space observation;
- hazard feeds and hazard-related analysis already implemented;
- AI Research / Evidence Worker / OpenAI Evidence Explainer;
- Terra Agentic EO Coordinator / Source Scout / Evidence Verifier;
- published tests 001–016 and which ones have actual evidence packages;
- Agentic EO benchmark and its real published result;
- NVIDIA L4 Training #1–#4: what each truly did, exact evidence limitations, and what may be reused by ForgeMCP;
- provenance, evidence policies, archive/export, security and scientific claim boundaries;
- deployment paths and public pages.

Do not turn training metrics into environmental ground truth. Do not invent causal findings.

### `docs/AUDIT_CUBE_FULL_HISTORY.md`
A complete capability audit with appendix/table covering every Cube PR number.

At minimum verify and map current reusable Cube capabilities around:
- playable true 3D 8×8×8 = 512 board;
- deterministic rules engine and legal move generation;
- current renderer / Three.js / board/camera/layers;
- player vs player and player vs computer paths;
- AI Web Worker, Alpha-Beta, iterative deepening and difficulty profiles;
- move safety, promotion-aware search, exchange safety, final blunder veto;
- team-play / whole-army policy work;
- PR #101 100K virtual-policy-tuning methodology and exact limitations;
- PR #102 3K legal rollout methodology and exact limitations;
- PR #103/#104 search and team-coordination improvements;
- any earlier/later self-play, tournament, benchmark, opening, transposition, Zobrist, evaluation or policy components;
- saves, undo/redo, promotion, PWA, WebSocket/multiplayer, forum/auth where present;
- tests, Playwright/smoke/build, Docker/Tauri/deployment;
- 3D assets/models: especially the owner-provided Meshy models integrated by PR #107, their actual runtime path, fallback path and current visual limitations;
- visual/UI/accessibility/mobile work;
- ForgeMCP native integration PR #110/#111.

Never call PR #101/#102 neural-network training. Never convert rollout counts into full tournament games if they were not full games.

### `docs/WEBMCP_REUSE_MAP.md`
Build a concrete reuse matrix:

`Existing real capability -> current source module/function/route -> proposed WebMCP tool -> read/write -> verification/source of truth -> demo-visible effect -> implementation effort`.

Prioritize reusing existing functions, not duplicating them in ForgeMCP.

For Terra propose the strongest real tools based on audited code, e.g. search/AOI/observations/terrain/elevation/water/river/lake/historical comparison/season comparison/dryland/paleochannel/evidence verification/reporting, but only list a tool as CONNECTABLE if a real underlying function/endpoint/module exists.

For Cube map real engine functions to tools for position inspection, legal moves, self-play, candidate creation, policy comparison, game inspection, blunder analysis, benchmark/evaluation, promotion/rollback, and visual preview. Mark anything requiring new implementation rather than pretending it exists.

### `docs/WEBMCP_CHALLENGE_NEXT_PLAN.md`
Create the implementation plan after the audit. It must answer: what human + agent can do together through WebMCP that is visibly stronger than the pre-challenge apps?

The plan must center on 3 judge-visible end-to-end outcomes:

1. TERRA REAL RESEARCH MISSION
Human asks to investigate a real place/environmental risk -> coordinator -> WebMCP calls existing Terra capabilities -> real official/public data/evidence -> terrain/water/historical analysis -> scientific classification -> confidence/uncertainty -> verification and required field/in-situ checks -> visible result.

2. CUBE REAL AI IMPROVEMENT LAB
Human asks to improve the opponent -> WebMCP uses the real Cube rules/AI path -> baseline vs candidate under identical conditions -> actual completed legal games or clearly labelled legal rollouts depending what engine path truly supports -> real records/metrics -> compare -> PASS/WARNING/FAIL -> promotion remains human-approved and reversible.

3. CUBE REAL VISUAL IMPROVEMENT
Human asks to improve readability -> WebMCP Visual Agent inspects current board + existing Meshy models/materials/camera/layers -> proposes a real reversible config/code/preview change -> BEFORE/AFTER -> QA -> human approve/reject/rollback.

For each, specify exact existing modules to reuse, exact missing bridge code, exact WebMCP tool names, public route, verification, tests and expected visible evidence.

### `docs/PRE_CHALLENGE_VS_WEBMCP.md`
Create the challenge provenance split required by competition rules:
- what existed before the WebMCP Challenge period;
- what has been added specifically for ForgeMCP/WebMCP;
- what remains to be implemented;
- why WebMCP is necessary rather than cosmetic.

Use PR dates/commits. Do not misrepresent old capabilities as new challenge work.

## Current important known facts to verify, not blindly trust

- Terra is already a large working Earth-observation platform, not a prototype to rebuild.
- Terra has Agentic EO Coordinator, Source Scout, Evidence Verifier and a published 10-case benchmark. Verify exact current evidence and result.
- Terra includes multiple research stations and substantial hydrology/terrain/time-series work. Find it all.
- Cube is already a playable public 3D game with deterministic engine.
- Cube already contains extensive AI safety/team-play work and owner-supplied 3D models.
- Historical Cube PR #101 is policy tuning over 100K virtual games, not neural-network training.
- Historical Cube PR #102 is 3K legal rollouts, not necessarily 3K complete tournament games.
- ForgeMCP must extend these systems through real WebMCP tools rather than copy them.

## WebMCP Challenge constraints

- Real `document.modelContext.registerTool(...)` implementation.
- Human and specialist agents act through real application functions.
- One responsibility per tool, validated input/output, structured result, tests, least privilege.
- Agent never replaces source of truth.
- Terra truth = official/public data + measurements + provenance + deterministic analysis + verification.
- Cube truth = deterministic rules engine + actual executed legal records.
- Mutating/promotional actions require explicit human approval and rollback where possible.
- Zero API keys/tokens/passwords/.env/private credentials in repo.
- No fabricated data, benchmark results, self-play counts, Elo, scientific findings or QA results.

Scientific status vocabulary for Terra:
OBSERVATION / ANOMALY / HYPOTHESIS / PRELIMINARY_RISK_ALERT / VERIFIED_FINDING / INSUFFICIENT_DATA.

A PRELIMINARY_RISK_ALERT must contain location, time, sources, observed indicators, confidence, uncertainty and required ground/in-situ verification. Satellite evidence alone must not be described as proving a physical cause it cannot establish.

## Execution instructions

Do not merely write a plan from memory.

1. Fetch the complete paginated PR histories for both repos.
2. Inspect current `main` source trees and the most important modules referenced by PRs.
3. Cross-check major claims against current code and merged status.
4. Write the five audit/roadmap documents above.
5. If useful, add a small machine-readable `docs/audit-capability-map.json` with capability IDs, repo, PR evidence, current status, source paths, and proposed WebMCP tool.
6. Run formatting/link/basic repository validation available in ForgeMCP. Do not alter the live application in this audit branch unless a tiny documentation-link fix is necessary.
7. Print final totals: number of Terra PRs audited, Cube PRs audited, merged/open/superseded counts, number of reusable capabilities, number of proposed WebMCP bridges, top 10 highest-value existing capabilities we should expose first, and the 5 biggest true implementation gaps.
8. Commit all audit outputs to the current branch.

This audit is intended to stop us from wasting challenge time rebuilding capabilities that already exist.