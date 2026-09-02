# Judge testing

Live ForgeMCP app: https://terraforming-planet.github.io/ForgeMCP-Multi-Agent-Research---Game-Studio/

1. Open the live app above, or run `npm ci && npm run typecheck && npm test && npm run build`, then `npm run dev`.
2. Open `/#/dashboard`. A supported browser reports `WEBMCP_AVAILABLE`; otherwise exact instructions appear and dashboard execution remains usable.
3. Click **Demo: OBSERVE Terra**. Confirm Nominatim, EONET and Copernicus DEM/Open-Meteo provenance. Network failure must produce `NOT_CONNECTED` / `INSUFFICIENT_DATA`.
4. Click **Demo: LEARN & COMPETE**. Confirm exactly four completed records, legal replay moves, paired seeds 512/513 with side swaps, and no Elo. Promotion still awaits human approval.
5. Click **Demo: CREATE + QA**. Confirm before/after, deterministic QA, `reversible: true`, and `mutatesLiveGame: false`.
6. Inspect WebMCP Tools. In a WebMCP client, call a tool with invalid input and confirm structured `FAIL`.
7. Open `/#/labmcp` and run TEST 001. Confirm the recorded signal is `ANOMALOUS_RECORDED`, the environmental state is `HYPOTHESIS`, QA is `WARNING`, the Toruń reference is unresolved, 12 context-only analogues are returned, and exact 2026 loss/cause remain unset.

Terra: https://terraforming-planet.github.io/Polar-Sun-Moon-Analysis/

Cube: https://teslaeco.github.io/Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer/
