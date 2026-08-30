# Codex task — ForgeMCP visible real-effects pass

Work in the public ForgeMCP repository. The previous challenge pass is already merged into `main`. This task is not about adding more marketing copy. The owner must be able to open public pages and SEE real effects produced by ForgeMCP for Terra Observation System and Cube Chess 512.

## Goal

Create a judge-ready, human-visible live demo with three concrete workflows:

1. TERRA — a real place, real external/public data lookup, provenance, uncertainty, and a visible research result.
2. CUBE SELF-PLAY — actual legal baseline-vs-candidate games executed through the deterministic Cube engine path already in the repo, with real per-run counts and metrics.
3. CUBE VISUAL — a visible reversible BEFORE/AFTER readability preview with QA and explicit human approval gate.

Do not claim anything that did not really execute.

## Public pages / routes

Create stable user-facing routes or equivalent deep-link states so the owner and judges can test each workflow directly, preferably:

- `/demo/terra`
- `/demo/cube-selfplay`
- `/demo/visual`

Also provide a landing dashboard with three large one-click buttons.

The app must work when deployed under the GitHub Pages repository subpath, not only at `/` on localhost. Configure Vite/router accordingly.

## TERRA — visible real effect

Build a one-click demo that starts with a real place. Choose a reliable default AOI that is scientifically understandable and likely to return public events/observations, but also allow the user to type/search another place.

Minimum visible sequence:

Human request
→ Coordinator
→ Source Scout
→ `search_location`
→ AOI shown on screen with coordinates
→ real external observation lookup through the existing truthful Nominatim/NASA EONET adapter(s)
→ Evidence Verifier
→ structured result

The screen must visibly show:
- place/AOI
- coordinates
- request time/range
- exact public source names
- source URLs/provenance if available
- observation count returned by the actual request
- each observation/event name and date when available
- classification restricted to OBSERVATION / ANOMALY / HYPOTHESIS / PRELIMINARY_RISK_ALERT / VERIFIED_FINDING / INSUFFICIENT_DATA
- confidence
- uncertainty
- required field/in-situ verification
- PASS/WARNING/FAIL verification state

Important: NASA EONET event presence is not proof of a specific local cause. If data is insufficient for a risk statement, show `INSUFFICIENT_DATA` rather than inventing a hazard.

The demo must make at least one real network call in normal browser execution. Add a visible network/source state so the owner can distinguish `LIVE DATA` from fallback/error.

If CORS/network failure occurs, return a truthful structured failure and still show provenance/what failed.

## CUBE — visible real self-play effect

Use the deterministic Cube engine path that was added in the previous pass. Audit it first. Do not silently replace it with random fake outcomes.

Create a user-facing self-play lab where a human can click e.g. `Run 4 real games` (small number is fine for reliability) and SEE the games actually execute.

Required visible fields:
- baseline policy/version
- candidate policy/version
- number of requested games
- number of actually completed games
- deterministic seed/opening id for every game
- side/color assignment and swap
- legal move count
- illegal move count (must be measured, not hardcoded)
- result/termination reason
- move list or replayable move log accessible per game
- total W/D/L
- material-loss/blunder proxy if implemented deterministically
- move/position diversity
- elapsed time / move time where measurable
- search nodes only if truly exposed by the engine; otherwise show `NOT_AVAILABLE`
- Elo only if there is a documented real methodology; otherwise do not show Elo

Add a simple animated progress view while games execute so it is obvious this is not a static table.

Candidate evaluation must end in PASS/WARNING/FAIL based on a documented threshold. Promotion control must remain disabled unless:
1. benchmark PASS,
2. legality/regression PASS,
3. human explicitly approves.

A click on promotion may update only a reversible local/demo state unless there is a safe real persistent path. Never overwrite the upstream Cube live game automatically.

Show a prominent truth statement: `This run reports only games executed in this run.`

## CUBE VISUAL — visible before/after effect

Create a direct page where the user can SEE a deterministic/reversible visual readability proposal.

Use current Cube UI/board metadata/configuration already available in the repo or a clearly-labelled preview model. Do not pretend a screenshot is live if it is not.

Show side-by-side or toggleable BEFORE and AFTER representations. The change should be visibly meaningful, for example:
- clearer layer separation for 8 board levels,
- stronger selected-square/legal-move contrast,
- improved camera/readability overlay,
- mobile scale/readability adjustment,
- accessible contrast indicators.

Show:
analysis → proposed changes → BEFORE/AFTER → QA checks → PASS/WARNING/FAIL → Approve / Reject

Approval only updates the reversible preview/demo configuration unless a safe real mutation path exists. Include Reset/Rollback.

## Coordinator / WebMCP visibility

For all three pages, make the WebMCP collaboration visible rather than hidden:
- HUMAN REQUEST
- COORDINATOR
- ACTIVE AGENT
- WEBMCP TOOL
- REAL SOURCE / ENGINE
- RESULT
- VERIFICATION
- HUMAN DECISION

Use the existing real `document.modelContext.registerTool(...)` path. Ensure the newly exposed demo actions are reachable through WebMCP tool registration where appropriate, with validated inputs and structured outputs.

Unsupported browsers must show clear instructions instead of crashing.

## Deployment

Add a production GitHub Pages deployment workflow for ForgeMCP if it does not already exist. It should deploy `main` automatically and support Vite base path for:

`https://terraforming-planet.github.io/ForgeMCP-Multi-Agent-Research---Game-Studio/`

The workflow must use official GitHub Pages actions and no secrets other than normal GitHub Pages permissions.

Add README links to:
- live ForgeMCP
- direct Terra demo
- direct Cube self-play demo
- direct Visual demo
- upstream Terra
- upstream Cube

If Pages requires a repository setting that code cannot enable, document the exact single manual step in `docs/JUDGE_TESTING.md`; do not falsely claim deployment is live.

## Tests

Add/strengthen tests that prove the visible demos are backed by real logic:
- Terra network adapter success shape and failure -> no fabricated success
- classification safety
- Cube requested count equals real executed records
- every recorded move accepted by legality path
- side swap/seeds deterministic
- benchmark aggregation derives from actual records
- promotion gate cannot pass without all three conditions
- visual preview is reversible
- router/base path supports Pages
- WebMCP registration for demo tools

Run and fix until all pass:
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run lint`

## Security/truth

Never commit API keys/tokens/.env/credentials.
Never fabricate external calls, observations, game counts, W/D/L, Elo, benchmark improvement, QA PASS, or source connectivity.
Do not label historical PR #101/#102 as neural-network training.
Do not use historical 100K/3K counts as results of this new demo.

## Final report

At the end print:
- exact public routes created
- exact WebMCP tools used by each route
- exact Terra external sources called
- exact number of Cube games executed by tests and by default demo configuration
- benchmark methodology
- visual change demonstrated
- tests/build/lint status
- deployment status and any manual Pages step
- honest remaining limitations
- changed files

Do not stop at a plan. Inspect, implement, test, fix, and commit the working result to the current branch.