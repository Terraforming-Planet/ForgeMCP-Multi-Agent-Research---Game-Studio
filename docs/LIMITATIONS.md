# Known Limitations

- Terra uses direct public Nominatim, NASA EONET and Open-Meteo/Copernicus DEM adapters; it does not control or mutate the upstream Terra application.
- Public providers can be unavailable or CORS-blocked. The tools then return `NOT_CONNECTED` or `INSUFFICIENT_DATA`; no fallback observations are fabricated.
- Cube execution is local through a pinned authoritative engine adapter. It is not connected to a remote model registry or the live Cube deployment.
- The demo policies are deterministic heuristics, not neural networks. The 40-ply limit can produce artificial draws; no Elo is calculated.
- Visual QA checks configuration only. Screenshot rendering, user studies and live upstream application are `NOT_CONNECTED`.
- Candidate/station state is in browser memory and is not a production persistence layer.
- The public Pages URL becomes available only after the deployment workflow reaches `main` and succeeds.
- WebMCP requires a browser exposing `document.modelContext.registerTool`; other browsers receive visible instructions and continue in dashboard mode.
- LabMCP TEST 001 retrieves recorded results; it does not execute a fresh CDSE, USGS, Sentinel or Landsat processing job.
- The exact Toruń reference dataset remains unresolved. The PZW record is a candidate only because its visible size entry has no stated unit or hydrological time series; Vistula TEST 014 is methodology context only.
- Global analogues establish plausibility of mechanisms, never the local cause. No current hazard severity, exact 2026 loss percentage, infrastructure failure or repair effect is verified.
- Linked PZW, Sejm, municipal and technical documents are curated source references and are not fetched/revalidated by the browser handler during a run.
