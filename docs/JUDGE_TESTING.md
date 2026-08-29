# Judge testing

1. Run `npm ci && npm run typecheck && npm test && npm run build`, then `npm run dev`.
2. Open `/dashboard`. A supported browser reports `WEBMCP_AVAILABLE`; otherwise exact instructions appear and dashboard execution remains usable.
3. Click **Demo: OBSERVE Terra**. Confirm Nominatim, EONET and Copernicus DEM/Open-Meteo provenance. Network failure must produce `NOT_CONNECTED` / `INSUFFICIENT_DATA`.
4. Click **Demo: LEARN & COMPETE**. Confirm exactly four completed records, legal replay moves, paired seeds 512/513 with side swaps, and no Elo. Promotion still awaits human approval.
5. Click **Demo: CREATE + QA**. Confirm before/after, deterministic QA, `reversible: true`, and `mutatesLiveGame: false`.
6. Inspect WebMCP Tools. In a WebMCP client, call a tool with invalid input and confirm structured `FAIL`.

Terra: https://terraforming-planet.github.io/Polar-Sun-Moon-Analysis/

Cube: https://teslaeco.github.io/Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer/
