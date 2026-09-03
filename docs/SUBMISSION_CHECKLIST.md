# Submission Checklist

- [x] Public repository
- [x] MIT/open-source license
- [x] Working public URL: https://terraforming-planet.github.io/ForgeMCP-Multi-Agent-Research---Game-Studio/
- [x] Production build PASS
- [x] Real WebMCP implementation
- [x] Multiple useful WebMCP tools
- [x] Real tool invocation verified
- [x] Terra integration tested — live Lake Chad run: 8 original satellite inputs, 1,531 matched Landsat catalogue scenes, no AI imagery passed to the model, no unverified alert emitted
- [x] Cube integration tested — four games executed, zero illegal moves, 135 distinct move records, benchmark gate PASS
- [x] ChatGPT browser tested — public routes loaded, 50 WebMCP tools discovered, guarded Shopify and B2B boundaries visible
- [x] Chrome tested — Google Chrome 151 native WebMCP smoke PASS, 50 tools discovered and real Terra/Cube/3D calls executed
- [x] Chrome local production build PASS — `document.modelContext.getTools()` / `executeTool()` used directly; no mocked modelContext
- [x] Chrome public GitHub Pages clean-browser PASS — same native WebMCP smoke executed on the public judging URL
- [x] Validation fail-closed tested — invalid `search_location` input returns structured `FAIL`
- [x] Human-approval fail-closed tested — `promote_ai_candidate` without literal approval returns structured `FAIL`
- [x] Verification visible
- [x] Provenance visible
- [x] Human approval visible
- [x] No secrets
- [x] Existing/new work documented
- [x] Challenge-period PR/commit timestamp evidence table documented in `docs/CHALLENGE_WORK.md`
- [x] Third-party software/data/asset attribution and official policy links documented in `THIRD_PARTY_NOTICES.md`
- [x] English judge/testing material complete; remaining Polish experimental UI labels have an English translation table in `docs/JUDGE_TESTING.md`
- [x] Tests PASS
- [x] Four research stations visible and source-linked
- [x] Local glTF + PNG generator test PASS
- [x] Basic Game Generator creates a versioned playable game and deterministic computer reply
- [x] Cube Premium 30-day local test stays Cube-only and never gates judging
- [x] Cube Premium subscription route shows three board generators, seven figure/character presets, custom prompts, live 3D/texture previews and a playable local game
- [x] Pinned TEST 001 source pair visible before a live Terra run
- [x] Shopify/RFQ side effects blocked in TEST mode
- [x] Generated concepts separated from original satellite evidence
- [x] Judge instructions
- [x] README complete
- [x] Final clean-browser test — Chrome 151 opened the public Pages URL from a fresh temporary profile and executed WebMCP end to end
- [ ] Demo video under 3 minutes
- [ ] Audio
- [ ] Public YouTube URL
- [ ] Devpost rules explicitly acknowledged with exact `yes`
- [ ] Submission fields completed and project removed from draft state

## Chrome WebMCP evidence

The `Chrome WebMCP smoke` workflow launches a fresh Google Chrome 151 profile with WebMCP testing features enabled. It checks both the production build and the public GitHub Pages URL. The passing run reported:

- `toolCount: 50`
- Forge status: `READY`
- Terra AOI state: `PASS`
- Cube self-play state: `PASS`
- procedural 3D asset handler: structured `WARNING` (expected truth/manufacturing boundary, not a failed execution)
- invalid input: `FAIL` (expected fail-closed validation)
- missing human approval: `FAIL` (expected fail-closed promotion gate)

This evidence verifies the browser-native API path rather than only unit-testing the TypeScript registry.
