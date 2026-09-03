# Third-Party Notices and Data/Asset Boundaries

ForgeMCP is MIT licensed, but it integrates or references third-party software, public APIs, datasets and hosted imagery that remain subject to their own terms. This file is an attribution and compliance map, not a relicensing of third-party material.

## Earth-observation and mapping sources

| Provider / project | How ForgeMCP uses it | Compliance / attribution boundary |
| --- | --- | --- |
| OpenStreetMap / Nominatim | Public place lookup for Terra AOIs | OpenStreetMap data is provided under ODbL; Nominatim use is subject to the public Nominatim usage policy. ForgeMCP records the provider and query provenance and does not claim ownership of OSM data. |
| NASA EONET | Public event context near a Terra AOI | Used as public NASA event metadata/context. ForgeMCP does not treat EONET events as proof of causation. Provider/dataset provenance is retained. |
| NASA GIBS | Official/public browse imagery and clearly labelled fallback imagery | Images remain NASA/provider source material. ForgeMCP labels original/public source imagery separately from derived displays and generated visualizations and does not relicense NASA products as ForgeMCP assets. |
| USGS Landsat Collection 2 | Public catalogue/STAC matches and official browse assets | Landsat/USGS source material remains subject to USGS data policies and attribution guidance. ForgeMCP preserves source links and does not claim ownership of the imagery. |
| Copernicus Data Space / Sentinel-2 | Public/authorized WMS imagery where available | Use remains subject to Copernicus/European Union data terms and the relevant service terms. ForgeMCP preserves provider provenance and does not claim ESA/EU endorsement. |
| Copernicus DEM GLO-90 via Open-Meteo | Five raster elevation samples for terrain context | Samples are contextual raster values, not surveyed elevations or geotechnical ground truth. Service/data terms remain those of Open-Meteo and the underlying Copernicus DEM provider. |
| Terraforming Planet Terra evidence repositories | Recorded TEST 001 evidence, hydrology casebooks and source-linked context | These are project-owned/public records or project-maintained catalogues with their own source links. ForgeMCP preserves the distinction between recorded evidence, curated references and live provider data. |

Useful upstream policy/documentation links are kept in `docs/DATA_SOURCES.md` and in run-level provenance shown by the application.

## Game and 3D software

| Dependency / source | Use | License / boundary |
| --- | --- | --- |
| React / React DOM | ForgeMCP application UI | MIT licensed upstream packages. |
| React Router | Client-side routing | MIT licensed upstream package. |
| Vite | Build/development tooling | MIT licensed upstream project. |
| Zod | Runtime input validation for WebMCP contracts | MIT licensed upstream package. |
| Three.js | Playable Research Worlds V4 runtime 3D rendering and glTF export, loaded from jsDelivr in the standalone world | MIT licensed upstream project. The CDN does not transfer ownership of Three.js to ForgeMCP. |
| jsDelivr | CDN transport for the Three.js ESM files in `public/playable-worlds/index.html` | ForgeMCP uses the CDN only to deliver the pinned public package version; package licensing remains Three.js' MIT license. |
| Cube Chess 512 upstream | Deterministic 8×8×8 rules/benchmark source and public live reference | Pre-challenge upstream work. ForgeMCP pins/adapts the authoritative engine and documents the upstream commit. Historical game counts are not represented as ForgeMCP execution. |

## Images and visual assets in this repository

- `src/assets/forgemcp-hero-background.webp`, `src/assets/research-stations-concepts.webp`, and `src/assets/earth-figurine-concept.webp` are challenge presentation/concept assets used by ForgeMCP and are explicitly labelled in the product as generated/concept artwork where applicable.
- Generated 3D textures, station materials, Earth Guardian textures and runtime Canvas textures are **visualization assets only**. They are never satellite evidence and are never substituted for NASA/USGS/Copernicus source products.
- Owner-supplied Cube source models/textures may be selected locally in the browser for the owner-reference intake. They are not automatically uploaded, published, relicensed or included in this repository. Redistribution requires the owner's rights/authorization for each file.

## Trademark and endorsement boundary

Provider names such as NASA, USGS, Copernicus, ESA, OpenStreetMap, Shopify, GitHub and Google Chrome identify data/services or compatibility targets. Their appearance does not imply sponsorship or endorsement of ForgeMCP unless explicitly stated by the provider.

## Demo-video rule

The competition demo should contain only ForgeMCP/project-owned visuals, permitted screen recordings of the running application, and narration/audio the entrant has rights to use. Do not add copyrighted music or third-party promotional footage without permission.

## Operational rule

If a provider's terms, availability, license or attribution requirement cannot be confirmed for a specific source, ForgeMCP must fail closed: keep the integration labelled `NOT_CONNECTED`, `INSUFFICIENT_DATA`, reference-only, or remove it from the judged path rather than invent authorization or provenance.
