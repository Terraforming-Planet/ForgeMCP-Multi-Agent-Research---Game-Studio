# ForgeMCP 3D + Texture Product Lab

The Product Lab has two explicit test tracks:

1. **Cube Asset Test** — figurine, board or texture concepts checked against the Game Studio workflow.
2. **Terra Station Test** — a conceptual research-station shell and an engineering request draft.

## What the generator really creates

`Generate procedural glTF + PNG` deterministically constructs model and texture bytes in browser memory from the current versioned specification, then exposes explicit download buttons:

- a self-contained glTF 2.0 JSON model with embedded geometry and an embedded 128×128 PNG base-colour texture;
- the same deterministic PNG texture as a separate download;
- a compact JSON QA manifest linking the files to the specification ID.

Figurine geometry contains a board/base, spherical Earth body, arms and legs. Board, station-shell and texture-plane presets have separate procedural geometry. Source size is entered in millimetres and converted to standard glTF metre coordinates. Identical inputs produce the same specification ID, geometry and texture.

This is a real low-poly prototype export, but it is not a sculpted production model, GLB/STL, complete PBR set, printability simulation, certified station device or manufacturing proof.

## Assistant and Codex boundary

The ForgeMCP assistant converts the human prompt into a versioned Codex handoff and QA plan. The included example is:

> Zrób mi model 3D figurki planety Ziemia jako bajkowej postaci stojącej na szachownicy czarno-białej z podświetleniem LED zielono-niebieskim.

Preparing the brief is not represented as external Codex execution. Generated files remain local until the human explicitly downloads or approves a later integration step.

## Shopify and B2B boundary

- The Shopify action creates only an unpublished local draft shape; no Admin or Storefront API is connected.
- A real Storefront product variant is required before `cartCreate` can produce a checkout URL.
- No payment, order or product publication occurs.
- Shopify B2B manages known companies and catalogues; it is not a supplier-discovery engine.
- The manufacturing RFQ stays `RFQ_DRAFT_NOT_SENT` because no verified supplier directory or recipient is connected.
- Checkout/order and RFQ-send tools require explicit human approval and still return `NOT_CONNECTED` until the relevant integration exists.

The final test is `INCOMPLETE` until current model/texture data, generator checks, Codex brief, Shopify mapping draft and RFQ draft all exist for the same specification. Only then is the result `PASS_WITH_EXPECTED_BLOCKS`: useful downloadable data and drafts are ready while external commercial side effects remain blocked.
