# ForgeMCP Premium Visual Pack intake

This document defines how a large 3D/model texture archive may be connected to the ForgeMCP demo without making unsupported ownership, licensing, performance or contest claims.

## Do not place the 5 GB source archive in the web bundle

The raw archive is an **input to an asset pipeline**, not a page dependency. Do not import it through Vite, commit it to the normal Git repository, or make the first page load download it.

Use this pipeline instead:

1. Quarantine and scan the archive before extracting it.
2. Inventory every model, texture, material and embedded dependency.
3. Record author, source, acquisition date, license, redistribution permission and Challenge origin (`PRE_EXISTING` or `CHALLENGE_WORK`).
4. Reject any item whose license does not allow the intended public or commercial use. A marketplace purchase often allows use in a product but forbids redistribution of the raw asset.
5. Convert approved source assets to small runtime samples: retopology/decimation, baked normals and AO, GLB, Meshopt or Draco, KTX2/Basis textures and explicit LODs.
6. Generate thumbnails and a versioned catalog with byte sizes and SHA-256 digests.
7. Store approved runtime files in object storage/CDN and load only the selected item on demand, with progress, cancel, retry and a static fallback.
8. Keep a small, fully working open demo in the public repository: four procedural station proxies, board, chess figures and Earth Guardian.

The public `/#/cube-premium` route supplies that working fallback today. It generates three board geometries and seven figure/character presets locally from versioned specifications, shows the exact generated glTF and PNG texture in paired previews, exposes QA manifests and includes an editable prompt. These procedural samples are independent of the external archive and remain available when no CDN asset has been approved.

## Required catalog record

```json
{
  "id": "stable-public-id",
  "title": "Human-readable asset title",
  "kind": "model-or-texture",
  "origin": "PRE_EXISTING",
  "author": "Rights holder",
  "source": "Original source or repository URL",
  "sourceCommit": "Commit or release when applicable",
  "license": "SPDX id or exact custom license reference",
  "redistributionApproved": true,
  "attribution": "Required attribution text",
  "runtimeUrl": "CDN URL for optimized sample",
  "thumbnailUrl": "Small WebP preview URL",
  "format": "model/gltf-binary",
  "bytes": 0,
  "sha256": "hex digest",
  "lod": "preview"
}
```

## WebMCP Challenge boundary

- Mark the submission as an existing project and identify the meaningful WebMCP work completed during the Challenge period.
- Do not claim pre-existing models were created during the Challenge.
- Keep the judged experience and the assets necessary to test it free and unrestricted through the judging period.
- “Premium” is a visual-pack/product-concept name in the current prototype. It is not a payment, ownership or production-readiness claim.
- Keep third-party notices and asset licenses separate from the repository's MIT code license.

No archive should be published or offered for sale until its asset-level provenance and redistribution rights have been reviewed.
