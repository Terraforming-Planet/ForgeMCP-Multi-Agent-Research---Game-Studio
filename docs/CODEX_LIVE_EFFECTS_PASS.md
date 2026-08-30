# Codex task — ForgeMCP visible real-effects pass (REPAIR / MUST CHANGE CODE)

You are working on branch `forgemcp-live-effects-pass` in the public ForgeMCP repository.

The previous run incorrectly finished with **zero tracked implementation changes**. That is not acceptable. This repair pass MUST inspect the current code and MUST produce real source-code changes before validation/commit.

## Current audited gap — do not treat this as already complete

`src/App.tsx` currently routes `/terra`, `/selfplay`, and `/creation` mostly to the generic `Dashboard`, and several areas remain placeholders. The required judge-facing live-effect pages do not yet exist as dedicated implementations.

Therefore this run MUST create dedicated working demo components/routes and wire them into the app. Do not stop after analysis and do not answer that the work already exists.

## Mandatory changed files

At minimum, create or materially modify ALL of these:

- `src/App.tsx`
- `src/components/TerraLiveDemo.tsx`
- `src/components/CubeSelfPlayLiveDemo.tsx`
- `src/components/VisualReadabilityLiveDemo.tsx`
- `src/App.css` and/or `src/index.css`
- `src/tests/liveEffects.test.ts` (or equivalent dedicated test file)
- `src/webmcp/registry.ts` and/or the existing WebMCP registration file if needed to expose the demo actions
- `README.md`

Also add/update GitHub Pages deployment/configuration if it is still missing.

If an exact mandatory file already exists, materially improve it. The final `git status --short` MUST show tracked source/test/doc changes caused by this run.

## Required public routes

Implement dedicated routes/deep links:

- `/demo/terra`
- `/demo/cube-selfplay`
- `/demo/visual`

Add three large one-click cards/buttons on the landing/dashboard so a judge can launch each demo immediately.

The app must work under the GitHub Pages repository base path:
`/ForgeMCP-Multi-Agent-Research---Game-Studio/`

## 1) TERRA — visible real network effect

Create `TerraLiveDemo` as a real interactive page, not a static marketing card.

Required sequence visible on screen:
HUMAN REQUEST → COORDINATOR → SOURCE SCOUT → WEBMCP TOOL → REAL SOURCE → RESULT → EVIDENCE VERIFIER → VERIFICATION → HUMAN DECISION

Use the existing truthful Terra adapters. In normal browser execution make at least one real public network request using the existing Nominatim and/or NASA EONET integration path.

Default AOI may be Lake Chad, but the user must be able to search another place.

Show:
- place/AOI and coordinates
- request time/range
- exact source name
- source/provenance URL when available
- LIVE DATA / ERROR / FALLBACK state
- real observation/event count returned by this run
- event/observation names and dates when returned
- classification restricted to `OBSERVATION`, `ANOMALY`, `HYPOTHESIS`, `PRELIMINARY_RISK_ALERT`, `VERIFIED_FINDING`, `INSUFFICIENT_DATA`
- confidence
- uncertainty
- required ground/in-situ verification
- PASS/WARNING/FAIL verification state

Never turn absence of EONET events into proof of safety, and never invent a cause or hazard. On network/CORS failure show a structured truthful failure.

## 2) CUBE SELF-PLAY — real executed games

Create `CubeSelfPlayLiveDemo` backed by the deterministic Cube legality/engine path already present in this repo. Audit that path first. Do NOT generate random fake W/D/L rows.

Provide a visible button such as `Run 4 real games`.

For every run, actually execute the requested games and render progress while they execute.

Visible fields:
- baseline version/policy
- candidate version/policy
- requested games
- actually completed games
- deterministic seed/opening id per game
- side/color assignment and side swap
- legal move count measured from the legality path
- illegal move count measured, not hardcoded
- termination reason/result
- expandable move log per game
- total W/D/L derived from completed records
- deterministic blunder/material-loss proxy only if actually implemented
- diversity metric derived from executed records
- elapsed/move time where measurable
- search nodes only if really exposed, otherwise `NOT_AVAILABLE`
- no Elo unless there is a real documented methodology

Show prominently:
`This run reports only games executed in this run.`

Evaluation must return PASS/WARNING/FAIL from documented thresholds derived from actual run records.

Promotion stays disabled unless ALL are true:
1. benchmark PASS,
2. legality/regression PASS,
3. explicit human approval.

Promotion may only change reversible local/demo state unless a safe persistence path already exists. Never overwrite upstream Cube automatically.

## 3) CUBE VISUAL — visible BEFORE/AFTER

Create `VisualReadabilityLiveDemo` that visibly changes a real preview representation.

Must show side-by-side or toggleable BEFORE/AFTER, with a meaningful deterministic readability change such as:
- stronger 8-layer separation,
- clearer legal/selected-square contrast,
- improved overlay/camera/readability cues,
- mobile scale adjustment,
- accessible contrast indicators.

Required flow visible:
ANALYSIS → PROPOSED CHANGES → BEFORE/AFTER → QA → PASS/WARNING/FAIL → APPROVE / REJECT

Add Reset/Rollback. Approval changes only reversible preview/demo configuration unless there is an already-safe mutation path.

Do not present a static screenshot as a live engine effect.

## WebMCP visibility and tools

Use the existing real `document.modelContext.registerTool(...)` path.

Expose appropriate structured demo actions through WebMCP with validated inputs/outputs. Prefer small single-responsibility tools, e.g. existing equivalents of:
- Terra search/observation tool
- Cube self-play run/evaluate tool
- visual preview/apply/reset tool

Do not duplicate a tool if an equivalent already exists; wire the page to the existing real implementation and registration.

Unsupported browsers must show a clear `WebMCP unavailable in this browser` message without crashing, while the human UI demo remains usable where technically possible.

## Deployment

If missing, add a GitHub Pages workflow using official Pages actions that deploys `main` and supports Vite base path for:
`https://terraforming-planet.github.io/ForgeMCP-Multi-Agent-Research---Game-Studio/`

README must contain direct links for:
- ForgeMCP live site
- `/demo/terra`
- `/demo/cube-selfplay`
- `/demo/visual`
- upstream Terra
- upstream Cube

If repository Pages settings require one manual action, document only that exact action in `docs/JUDGE_TESTING.md`.

## Tests — mandatory

Add/strengthen tests proving the demos are backed by logic, not text:
- Terra success shape comes from adapter response
- Terra network failure never becomes fabricated success
- safe classification behavior
- Cube requested count equals actual executed records
- every recorded move is accepted by legality path
- seeds and side swap deterministic
- benchmark aggregation is derived from actual records
- promotion gate cannot pass without benchmark + legality + human approval
- visual preview changes state and rollback restores BEFORE state
- routes/base path work for GitHub Pages
- WebMCP registration contains the demo-capable tools

Run until green:
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run lint`

## Security and truth

Never commit API keys, tokens, `.env`, credentials, private data, or generated secrets.
Never fabricate external calls, observations, game counts, W/D/L, benchmark improvement, QA PASS, search nodes, Elo, or connectivity.
Do not call historical PR #101/#102 neural-network training.
Do not reuse historical 100K/3K counts as results of this demo.
The deterministic rules engine remains the source of truth for Cube legality.

## Completion gate — critical

Before ending, run:

```bash
git status --short
git diff --stat
```

If there are **zero tracked implementation changes**, you have NOT completed the task. Continue implementing until the mandatory source/test files above are changed.

Do not merely print a plan or final report. Inspect → implement → test → fix → verify tracked diff.

Then print a concise final report containing:
- routes created
- WebMCP tools used
- real Terra sources called
- default self-play game count and how counts are derived
- benchmark methodology
- visual change demonstrated
- typecheck/test/build/lint status
- deployment status/manual Pages step if any
- changed files
- remaining limitations
