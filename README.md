# ForgeMCP — Multi-Agent Research & Game Studio

Judge-ready browser application for the OpenAI WebMCP Challenge 2026:

`HUMAN → COORDINATOR → SPECIALIST AGENTS → WEBMCP TOOLS → REAL DATA / ENGINE → VERIFICATION → HUMAN DECISION`

**Live app:** https://terraforming-planet.github.io/ForgeMCP-Multi-Agent-Research---Game-Studio/

It is not a chatbot. The coordinator is deterministic and never claims an LLM ran. Terra findings come from public providers; Cube results come from executed legal games. The separate Product Lab can generate a local low-poly glTF prototype and texture, but never calls it a production or manufacturing-ready model.

## Visible workspaces

- **OBSERVE — Terra:** Nominatim place lookup, bounded AOI/station, NASA EONET context, Copernicus DEM samples through Open-Meteo, provenance, uncertainty, and evidence verification. Empty or failed providers return `INSUFFICIENT_DATA` / `NOT_CONNECTED`.
- **LabMCP — general Terra hazard investigation:** the human selects or types any region, years, season, AOI radius and hazard classes (water loss, inflow/outflow obstruction, terrain change, flood, snow avalanche, landslide, wildfire or coastal change). One run invokes the public Terra evidence Worker, an annual USGS Landsat/NASA GIBS gallery, Copernicus DEM context, NASA EONET, causal-hypothesis agents, an unsent preliminary-alert draft, conditional repair/regeneration options and a field-verification gate. TEST 001 near Lake Kuchnia is a preset with extra recorded evidence and the non-substituting Toruń resolver, not the application's scope boundary.
- **LEARN & COMPETE — Cube:** a pinned authoritative 8×8×8 engine executes four small candidate-v-baseline games with paired seeds and side swaps. Records contain replayable moves, results, termination, legality, deterministic material proxy and engine version. No Elo is claimed.
- **GAME STUDIO — four station systems:** Arctic, Sahara, Ocean and Earth–Space source stations become distinct rotating procedural station prototypes and material/lighting systems. The local Basic Game Generator creates a versioned, deterministic Capture Chess blueprint, resets a playable 8×8 board, optionally replies with a deterministic computer heuristic and ends after a king capture. The click-to-load live Cube 8×8×8 deployment remains separate.
- **CREATE — visible 3D + texture export:** the two-track Product Lab creates a versioned asset specification, shows the exact generated vertex/index geometry in a draggable rotating viewer, and exports a self-contained low-poly `.gltf`, deterministic `.png` texture and QA manifest. Earth Guardian, all six standard piece roles, board and four instrumented station examples are supported deterministic presets—not a claimed free-form generative model.
- **CUBE PREMIUM SUBSCRIPTION TEST:** a separate 30-day local browser-state prototype for Cube visual assets. The subscription route now contains a free judge preview with three genuinely different generated boards (Cube Chess 512 with eight 8×8 levels, Classic Black & White and Lab LEDColor), seven recognizable figure/character choices, editable prompts, colour/LED controls, paired live 3D + PNG previews, glTF/texture/QA downloads, a Codex handoff prompt and the playable deterministic Basic Game Generator. It creates no account, payment, Shopify cart, recurring charge or server entitlement; it never gates the free judged experience and does not include Terra or research stations.
- **SHOPIFY / B2B TEST:** prepares a local product-mapping brief for a future Shopify integration and an unsent manufacturing RFQ. It does not claim a ready `ProductCreateInput`. Checkout, payment, order, supplier discovery and RFQ transmission remain blocked until real integrations, recipients and explicit human approval exist.

The generated hero, four-station panorama and Earth Guardian render are visibly labelled concept artwork. They are never presented as original satellite products, deployed hardware, photographs or finished 3D meshes.

## WebMCP tools

The browser registers real handlers using `document.modelContext.registerTool(...)`. Implemented tools:

There are **50 registered tools** across system, Terra, Cube, visual QA, verification and commerce domains. The commerce additions are:

`list_asset_station_presets`, `configure_3d_asset`, `generate_procedural_asset_preview`, `generate_procedural_asset_files`, `run_asset_qa`, `prepare_codex_asset_prompt`, `prepare_shopify_product_draft`, `create_shopify_test_cart`, `prepare_b2b_rfq`, `submit_b2b_rfq`.

The remaining tools cover runtime status; place/AOI/station handling; official/public observation, imagery, DEM and hazard investigation; evidence verification; the pinned Cube benchmark and promotion gates; and reversible visual QA. `list_capabilities` returns the exact live inventory.

Unsupported browsers show `WEBMCP_UNAVAILABLE`; the dashboard itself still works. Mutating/promotion tools validate inputs, return structured status, and promotion/rollback require literal `humanApproved: true` plus applicable automated gates.

## Truth and provenance

- Terra upstream: [source](https://github.com/Terraforming-Planet/Polar-Sun-Moon-Analysis) and [live app](https://terraforming-planet.github.io/Polar-Sun-Moon-Analysis/). Commit `fd47cbf1137b1094e932b6657cbb4af4de9373d7` is the audited adapter baseline; live Worker responses can include later, explicitly sourced Terra capabilities, so run-level provenance remains authoritative.
- Cube upstream: [source](https://github.com/teslaeco/Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer) and [live app](https://teslaeco.github.io/Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer/). The vendored deterministic engine is pinned to `9543accfcef8f8786c32aed282aa63e49ad27615`.

Existing [PR #101](https://github.com/teslaeco/Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer/pull/101)'s 100K virtual policy-tuning games and [PR #102](https://github.com/teslaeco/Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer/pull/102)'s 3K legal policy rollouts are historical upstream work, not neural-network training and not ForgeMCP execution. ForgeMCP reports only games executed in the current run. The external [visual-compliance dataset](https://huggingface.co/datasets/8Planetterraforming/ChessArena512AI-Visual-Compliance-Dataset) is provenance only; Forge does not claim its recorded ResNet50 weights are loaded in the live Cube engine.

The owner-authorized private Chess Arena workspace is used only as design/training provenance. Its published diagnostic smoke evidence is 300 curriculum games plus three legal rollouts; no private source, model checkpoint or private GLB is shipped in this public app. A larger 100K + 3K run and visual-training handoff are not claimed complete.

## Run and verify

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run dev
```

Open `/#/labmcp` for the satellite/hazard workspace, `/#/game-studio` for the four-station Game Studio and Basic Game Generator, `/#/cube-premium` for the local 30-day Cube-only product-flow test, `/#/shop-lab` for the local 3D/texture + Shopify/B2B test, or `/#/dashboard` for the lower-level control center. Vite uses a relative base and a hash router, and the Pages workflow publishes the static `dist/` build after changes reach `main`.

For the first deployment only, the repository owner must open **Settings → Pages**, set **Source** to **GitHub Actions**, and save. GitHub's repository `GITHUB_TOKEN` can deploy an enabled site but could not create the first Pages site in this repository; this was the cause of the `Get Pages site: Not Found / Resource not accessible by integration` failure. After saving the setting, rerun the failed Pages workflow.

## Trust boundaries and limitations

Public network access and an exact-origin CORS allowlist are required for live Terra calls. The UI therefore also shows a pinned TEST 001 source pair before a live run, without substituting it into another AOI. The public Terra Worker may invoke remote AI only for the explicit `ai_visual_image_count`; annual gallery slots are never silently labelled as model-inspected. EONET events provide contextual observations, not causes; DEM values are raster samples, not surveyed heights. No alert is sent and no physical intervention is ordered. `VERIFIED_FINDING` is locked behind a separate, human-approved field record with an independent expert, measurements, method and source. Candidate Cube state remains a browser-memory demo state, not a production model registry. Shopify is not connected and Shopify B2B is not represented as a manufacturer search engine.

See [LabMCP hazard investigation](docs/LABMCP_HAZARD_INVESTIGATION.md), [LabMCP TEST 001](docs/LABMCP_TEST_001.md), [3D and commerce lab](docs/PRODUCT_LAB.md), [premium asset-pack intake](docs/PREMIUM_ASSET_PACK.md), [judge testing](docs/JUDGE_TESTING.md), [demo script](docs/DEMO_SCRIPT.md), [limitations](docs/LIMITATIONS.md), [security](docs/SECURITY.md), and [challenge changes](docs/CHALLENGE_WORK.md).

## Before vs challenge work

Terra and Cube existed independently before the challenge. ForgeMCP added the browser coordinator, WebMCP execution contracts, public-data adapters, pinned engine adapter and executed benchmark, verification/event timeline, four-station interface, cosmic hub, local procedural glTF/PNG exporter, guarded commerce drafts, approval gates, and tests. Agents coordinate operations; they never become the authority.

MIT licensed.
