# ForgeMCP — Reviewer Demo Script (<3 minutes)

## One-sentence project summary
ForgeMCP is a browser-native WebMCP control layer that lets a human and AI agents work across two real systems: Terra Observation System for evidence-first Earth observation and Cube Chess 512 for deterministic game AI, self-play, visual improvement and verification.

## Important challenge boundary
Terra Observation System and Cube Chess 512 existed before the challenge. ForgeMCP is the new challenge-period WebMCP layer, coordinator, browser-native tools, verification/provenance UI, human-approval workflow, cross-project Game Studio work, Chrome verification and public reviewer experience built on top of those systems.

The challenge-period ForgeMCP implementation and iterative interface/code work were developed with OpenAI Codex assistance. Do not describe pre-challenge Terra or Cube work as created during the challenge.

## 0:00–0:20 — Open the home page
Narration:

“ForgeMCP connects real Earth observation and deterministic game AI through browser-native WebMCP. On one page you can see the two systems the agents work with: Terra Observatory and Cube Chess 512. The human stays in control, while WebMCP exposes real functions with provenance, verification and approval boundaries.”

Show only the main page. Do not tour menus.

## 0:20–1:20 — Terra Observatory
Open **Terra Observatory**.

Show:
- search for a real location;
- original/public satellite imagery clearly labelled as source imagery;
- date or observation comparison;
- higher-detail 1024 px WMS display previews where the provider supports that display request;
- optional sparse regional patrol of up to 20 closer ~1 km frames for better visual inspection;
- provenance/source/timestamp;
- confidence and uncertainty;
- a preliminary hazard result or hypothesis that remains bounded by verification.

Narration:

“ForgeMCP improved the Terra investigation workflow rather than inventing new satellite data. Search is location-first, display previews are clearer, evidence is easier to inspect, and agents can investigate water, terrain and hazard signals. Generated visuals are never used as satellite evidence. A hypothesis or preliminary alert is not presented as a verified fact without supporting evidence and, where required, ground verification.”

Do not say that the 1024 px preview increases native satellite sensor resolution. It improves the browser display request only.

## 1:20–2:10 — Cube Chess 512 + Game Studio
Open **Cube Chess / Game Studio**.

Show:
- the live 8×8×8 Cube Chess game;
- deterministic self-play/benchmark or a recorded benchmark result;
- legality / PASS-WARNING-FAIL result;
- one visible 3D/material improvement, for example Earth Guardian, Arctic ice vs steel, Ocean water vs marine metal, Sahara excavator/materials, classic board or Lab LEDColor concept;
- human approval boundary before promotion.

Narration:

“Cube gives ForgeMCP a deterministic environment. The rules engine decides legal moves. WebMCP can start bounded self-play, inspect games, compare candidates and run visual QA. During the challenge we also used the Game Studio workflow to improve model readability and materials, while keeping the changes reversible and testable. We do not invent Elo or call historical policy tuning neural-network training.”

## 2:10–2:45 — WebMCP proof
Open **WebMCP Proof** or the Control Center.

Show:
- 50 browser-native WebMCP tools discovered;
- Chrome 151 PASS;
- public GitHub Pages PASS;
- one real Terra call PASS;
- one real Cube call PASS;
- invalid input FAIL;
- promotion without human approval FAIL.

Narration:

“The key challenge requirement is not the UI—it is that real browser-native WebMCP calls real application functions. We verified 50 tools in Chrome 151 on both the production build and the public judging URL. Invalid input fails closed, and consequential promotion fails without human approval.”

## 2:45–2:58 — Close
Narration:

“ForgeMCP turns two existing systems into a human-plus-agent workflow: observe the real world with Terra, learn and compete with Cube, create improvements in Game Studio, and verify every important result before the human decides.”

## What not to show in the video
Do not spend time on subscription experiments, Shopify/RFQ test flows, long historical training tables, every research station, every WebMCP tool or internal development tabs. Those remain available as supporting evidence but are not part of the primary story.

## The project in one compact paragraph
ForgeMCP is an open-source multi-agent research and game studio created for the WebMCP Challenge. It adds a browser-native coordination layer over the pre-existing Terra Observation System and Cube Chess 512. In Terra, agents can resolve places, inspect original/public Earth-observation inputs, compare dates, inspect water/terrain/hazard signals, preserve provenance and uncertainty, and prepare bounded preliminary findings that require verification. In Cube, agents can invoke deterministic engine functions, run legal self-play and benchmarks, inspect games, analyze candidate changes and enforce promotion/rollback gates. Game Studio connects those workflows to reversible 3D/material improvements such as Earth Guardian, research-station themes, Arctic/Ocean/Sahara material separation and Cube board/piece presentation. The judged value is the new human-agent workflow through real WebMCP tools, not a relabeling of the older Terra or Cube projects.
