# Judge testing

Live ForgeMCP app: https://terraforming-planet.github.io/ForgeMCP-Multi-Agent-Research---Game-Studio/

1. Open the live app above, or run `npm ci && npm run typecheck && npm test && npm run build`, then `npm run dev`.
2. On the home page confirm that **Search satellite evidence**, **Open Game Studio** and **3D + Shopify Test** are visible without navigating through the technical dashboard.
3. Search a region in the hero. Confirm `/#/labmcp?region=...` opens with that region and that a real run distinguishes original official satellite products, derived/generated displays, hypotheses and an unsent alert.
4. Open `/#/game-studio`. Confirm four source-linked station systems, four board choices, four figure choices, the 8×8 preview and level selector. Cube 512 is `LIVE ENGINE`; PR #135/#126 work is visibly unmerged.
5. Click **Execute 4-game benchmark**. Confirm exactly four completed records, legal replay moves, paired seeds 512/513 with side swaps, and no Elo. Promotion still awaits human approval.
6. Open `/#/shop-lab`, keep the Earth Guardian example, and click **Generate procedural glTF + PNG**. Confirm a `.gltf`, `.png` and QA-manifest download are offered and manufacturing readiness stays false.
7. Prepare the Codex brief, Shopify draft and B2B RFQ. Confirm execution is not claimed, the product remains unpublished, checkout is disabled, and the RFQ is not sent.
8. Inspect WebMCP Tools. Confirm 50 tools are registered. In a WebMCP client, call a tool with invalid input and confirm structured `FAIL`.
9. Open `/#/labmcp` and run TEST 001. Confirm the recorded signal is `ANOMALOUS_RECORDED`, the environmental state is `HYPOTHESIS`, QA is `WARNING`, the Toruń reference is unresolved, 12 context-only analogues are returned, and exact 2026 loss/cause remain unset.

Terra: https://terraforming-planet.github.io/Polar-Sun-Moon-Analysis/

Cube: https://teslaeco.github.io/Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer/
