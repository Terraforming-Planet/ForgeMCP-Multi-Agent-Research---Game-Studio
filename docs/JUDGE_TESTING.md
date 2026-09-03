# Judge testing

Live ForgeMCP app: https://terraforming-planet.github.io/ForgeMCP-Multi-Agent-Research---Game-Studio/

## Fast judge path

1. Open the live app above, or run `npm ci && npm run typecheck && npm test && npm run build`, then `npm run dev`.
2. On the home page confirm that **Search satellite evidence**, **Open Game Studio** and **3D + Shopify Test** are visible without navigating through the technical dashboard.
3. Search a region in the hero. Confirm `/#/labmcp?region=...` opens with that region and that a real run distinguishes original official satellite products, derived/generated displays, hypotheses and an unsent alert.
4. Open `/#/game-studio`. Confirm four source-linked, instrumented station systems, board choices, piece-family choices, the playable/local game path and the separate Cube 8×8×8 live-engine reference.
5. In **Basic Game Generator V1**, enter an Earth/Sahara/Arctic/Ocean prompt and select the deterministic computer. Click **Generate playable game**. Confirm a stable blueprint ID/seed appears, the 64-square board resets, legal moves work and the truth boundary says this is Capture Chess—not FIDE, free-form AI or Cube 8×8×8.
6. Click **Execute 4-game benchmark**. Confirm exactly four completed records, legal replay moves, paired seeds 512/513 with side swaps, and no Elo. Promotion still awaits human approval.
7. Open `/#/shop-lab`, keep the Earth Guardian example, and click **Generate and show 3D model + texture**. Confirm a `.gltf`, `.png` and QA-manifest download are offered and manufacturing readiness stays false.
8. Prepare the Codex brief, Shopify draft and B2B RFQ. Confirm execution is not claimed, the product remains unpublished, checkout is disabled, and the RFQ is not sent.
9. Open `/#/cube-premium`. Start the 30-day local test and confirm the status persists only in this browser. Verify that it creates no payment/account and that the free Game Studio link remains active.
10. Inspect WebMCP Tools. Confirm at least 50 central tools are registered. In a WebMCP client, call a tool with invalid input and confirm structured `FAIL`.
11. Open `/#/labmcp`. Confirm two pinned, non-AI TEST 001 source images are visible before a run, then run TEST 001. Confirm exact 2026 loss/cause remain unset and no alert is sent.

## Chrome 149+ native WebMCP test

Chrome's official testing path is Chrome 149+ with `chrome://flags/#enable-webmcp-testing` enabled and the browser relaunched.

Manual verification:

1. Open the live ForgeMCP URL in a clean Chrome profile/incognito-capable test session.
2. Enable `chrome://flags/#enable-webmcp-testing` and relaunch Chrome.
3. Open ForgeMCP directly at `/#/dashboard`.
4. Confirm the page reports WebMCP available and the tool inventory is visible.
5. In Chrome DevTools → Application → WebMCP, or with a compatible WebMCP inspector/client, confirm the page exposes the tool list.
6. Execute `get_forgemcp_status` and confirm `READY`.
7. Execute `set_area_of_interest` with a valid WGS84 coordinate/radius and confirm structured `PASS`.
8. Execute `start_selfplay` with a bounded seed/max-plies request and confirm a real deterministic Cube game result.
9. Execute `generate_procedural_asset_files` and confirm a structured local glTF/PNG manifest rather than a claim of remote AI generation.
10. Call `search_location` with an invalid one-character query and confirm structured `FAIL`.
11. Try `promote_ai_candidate` without literal `humanApproved: true`; the tool must fail closed.

Automated equivalent: `.github/workflows/chrome-webmcp-smoke.yml` launches real Google Chrome in Xvfb with WebMCP testing features, calls `document.modelContext.getTools()` / `executeTool()`, executes the same bounded cross-domain checks, and runs against both the local production build and the public GitHub Pages URL. It does **not** mock `document.modelContext`.

## English translation for remaining Polish labels

The submission description, README, testing instructions and demo script are English. A few experimental game/world controls still contain Polish labels. Their judge-facing English translations are:

| UI label | English |
| --- | --- |
| `Regeneruj świat` | Regenerate world |
| `3D / tekstura runtime` | Runtime 3D / texture |
| `Źródło Terra` / `Otwórz źródło` | Terra source / Open source |
| `Gracz` | Player |
| `Misja` | Mission |
| `Status` | Status |
| `Pojazd` | Vehicle |
| `Interakcja` | Interaction |
| `Koparka` | Excavator |
| `Kop` | Dig |
| `Generuj element 3D` | Generate 3D element |
| `Reset kamery` | Reset camera |
| `Oddal kamerę` / `Przybliż kamerę` | Zoom camera out / in |
| `Wygeneruj teraz` | Generate now |
| `Pobierz glTF` / `Pobierz PNG` | Download glTF / PNG |
| `Zamknij` | Close |
| `PAUZA` | Pause |

The non-English labels are convenience UI only; all scientific classifications, truth boundaries, tool contracts and submission instructions are explained in English here.

## Source applications

Terra: https://terraforming-planet.github.io/Polar-Sun-Moon-Analysis/

Cube: https://teslaeco.github.io/Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer/
