# Known Limitations

- Terra uses direct public Nominatim, NASA EONET and Open-Meteo/Copernicus DEM adapters; it does not control or mutate the upstream Terra application.
- Public providers can be unavailable or CORS-blocked. The tools then return `NOT_CONNECTED` or `INSUFFICIENT_DATA`; no fallback observations are fabricated.
- Cube execution is local through a pinned authoritative engine adapter. It is not connected to a remote model registry or the live Cube deployment.
- The demo policies are deterministic heuristics, not neural networks. The 40-ply limit can produce artificial draws; no Elo is calculated.
- Visual QA checks configuration only. Screenshot rendering, user studies and live upstream application are `NOT_CONNECTED`.
- Candidate/station state is in browser memory and is not a production persistence layer.
- Public deployment URL still needs to be configured in repository settings/workflow.
- WebMCP requires a browser exposing `document.modelContext.registerTool`; other browsers receive visible instructions and continue in dashboard mode.
