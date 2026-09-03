# Judge testing

Live ForgeMCP app: https://terraforming-planet.github.io/ForgeMCP-Multi-Agent-Research---Game-Studio/

1. Open the live app above, or run `npm ci && npm run typecheck && npm test && npm run build`, then `npm run dev`.
2. On the home page confirm that **Search satellite evidence**, **Open Game Studio** and **3D + Shopify Test** are visible without navigating through the technical dashboard.
3. Search a region in the hero. Confirm `/#/labmcp?region=...` opens with that region and that a real run distinguishes original official satellite products, derived/generated displays, hypotheses and an unsent alert.
4. Open `/#/game-studio`. Confirm four source-linked, instrumented station systems, four board choices, piece-family choices, the 8×8 preview and level selector. Cube 512 is `LIVE ENGINE`; the PR #135 board themes and PR #126 refined figures are linked as upstream provenance.
5. In **Basic Game Generator V1**, enter an Earth/Sahara/Arctic/Ocean prompt and select the deterministic computer. Click **Generate playable game**. Confirm a stable blueprint ID/seed appears, the 64-square board resets, legal moves work and the truth boundary says this is Capture Chess—not FIDE, free-form AI or Cube 8×8×8.
6. Click **Execute 4-game benchmark**. Confirm exactly four completed records, legal replay moves, paired seeds 512/513 with side swaps, and no Elo. Promotion still awaits human approval.
7. Open `/#/shop-lab`, keep the Earth Guardian example, and click **Generate and show 3D model + texture**. Confirm a `.gltf`, `.png` and QA-manifest download are offered and manufacturing readiness stays false.
8. Prepare the Codex brief, Shopify draft and B2B RFQ. Confirm execution is not claimed, the product remains unpublished, checkout is disabled, and the RFQ is not sent.
9. Open `/#/cube-premium`. Start the 30-day local test and confirm the status persists only in this browser. Verify that it creates no payment/account and that the free Game Studio link remains active.
10. Inspect WebMCP Tools. Confirm 50 tools are registered. In a WebMCP client, call a tool with invalid input and confirm structured `FAIL`.
11. Open `/#/labmcp`. Confirm two pinned, non-AI TEST 001 source images are visible before a run, then run TEST 001. Confirm exact 2026 loss/cause remain unset and no alert is sent.

Terra: https://terraforming-planet.github.io/Polar-Sun-Moon-Analysis/

Cube: https://teslaeco.github.io/Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer/
