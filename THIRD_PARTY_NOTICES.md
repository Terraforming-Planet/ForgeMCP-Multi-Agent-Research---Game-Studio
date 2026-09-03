# Third-Party Notices and Data/Asset Boundaries

ForgeMCP is MIT licensed, but it integrates or references third-party software, public APIs, datasets and hosted imagery that remain subject to their own terms. This file is an attribution and compliance map, not a relicensing of third-party material.

## Earth-observation and mapping sources

| Provider / project | How ForgeMCP uses it | Compliance / attribution boundary | Official policy / licence |
| --- | --- | --- | --- |
| OpenStreetMap / Nominatim | User-triggered public place lookup for Terra AOIs | OpenStreetMap data is ODbL. The public Nominatim service permits moderate end-user-triggered search subject to its usage limits; ForgeMCP does not implement autocomplete or bulk geocoding. Browser requests carry the application origin as the referrer and results are attributed through source provenance. | [OSM copyright/ODbL](https://www.openstreetmap.org/copyright) · [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/) |
| NASA EONET | Public environmental-event context near a Terra AOI | Used only as event metadata/context. ForgeMCP does not treat EONET events as proof of causation. NASA/provider provenance is retained. | [NASA Earthdata data-use and citation guidance](https://www.earthdata.nasa.gov/engage/open-data-services-software/data-use-policy) |
| NASA GIBS | Official/public browse imagery and clearly labelled fallback imagery | NASA-led Earth science data are generally open; any source-specific restrictions still control. ForgeMCP identifies NASA as source, separates original/public imagery from derived/generated displays and does not imply NASA endorsement. | [NASA Earthdata data-use and citation guidance](https://www.earthdata.nasa.gov/engage/open-data-services-software/data-use-policy) |
| USGS Landsat Collection 2 | Public catalogue/STAC matches and official browse assets | USGS-authored data are generally U.S. public-domain/open data, while third-party material must be checked separately. ForgeMCP credits USGS/Landsat and preserves source links. | [USGS data licensing](https://www.usgs.gov/data-management/data-licensing) · [USGS copyrights and credits](https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits) |
| Copernicus Data Space / Sentinel-2 | Sentinel imagery/WMS where available | Copernicus Sentinel data are provided on a free, full and open basis under the Sentinel legal notice. Other Data Space portal content can have separate restrictions, so ForgeMCP uses provider data endpoints/source links rather than claiming the portal material as its own. | [CDSE terms](https://dataspace.copernicus.eu/terms-and-conditions) · [Copernicus Sentinel data licence](https://cds.climate.copernicus.eu/licences/ec-sentinel) |
| Copernicus DEM GLO-90 via Open-Meteo | Five raster elevation samples for terrain context | Open-Meteo API data are CC BY 4.0 and require attribution. ForgeMCP records `Open-Meteo` and `Copernicus DEM GLO-90 elevation API` in run provenance. Samples are contextual raster values, not surveyed elevations or geotechnical ground truth. | [Open-Meteo licence](https://open-meteo.com/en/license) |
| Terraforming Planet Terra evidence repositories | Recorded TEST 001 evidence, hydrology casebooks and source-linked context | Project-owned/public records or project-maintained catalogues retain their own source links. ForgeMCP preserves the distinction between recorded evidence, curated references and live provider data. | See `docs/DATA_SOURCES.md` and run-level provenance. |

### Operational service limits

The public Nominatim endpoint must remain **user-triggered and low-volume**. Its published policy sets an absolute maximum of one request per second, disallows client-side autocomplete/systematic querying and requires attribution. If ForgeMCP usage grows beyond a moderate judge/demo workload, the public endpoint must be replaced with a suitable hosted/self-hosted service rather than increasing load on OSMF infrastructure.

NASA Earthdata guidance notes that NASA-led mission data are generally open/CC0 unless a source is specifically marked with another restriction; source-specific restrictions still take precedence. USGS similarly warns that not every third-party illustration or image hosted on a USGS page inherits U.S. public-domain status. ForgeMCP therefore keeps provider/source identity in provenance instead of applying the repository MIT licence to external imagery.

## Game and 3D software

| Dependency / source | Use | License / boundary |
| --- | --- | --- |
| React / React DOM | ForgeMCP application UI | MIT licensed upstream packages; exact dependency versions are pinned through `package-lock.json`. |
| React Router | Client-side routing | MIT licensed upstream package. |
| Vite | Build/development tooling | MIT licensed upstream project. |
| Zod | Runtime input validation for WebMCP contracts | MIT licensed upstream package. |
| Three.js | Playable Research Worlds V4 runtime 3D rendering and glTF export, loaded from jsDelivr in the standalone world | MIT licensed upstream project. The CDN does not transfer ownership of Three.js to ForgeMCP. Source: [mrdoob/three.js](https://github.com/mrdoob/three.js). |
| jsDelivr | CDN transport for the pinned Three.js ESM files in `public/playable-worlds/index.html` | Used only as package transport. Package licensing remains Three.js' MIT license. |
| Cube Chess 512 upstream | Deterministic 8×8×8 rules/benchmark source and public live reference | Pre-challenge upstream work. ForgeMCP pins/adapts the authoritative engine and documents the upstream commit. Historical game counts are not represented as ForgeMCP execution. |

## Images and visual assets in this repository

- `src/assets/forgemcp-hero-background.webp`, `src/assets/research-stations-concepts.webp`, and `src/assets/earth-figurine-concept.webp` are challenge presentation/concept assets used by ForgeMCP and are explicitly labelled in the product as generated/concept artwork where applicable.
- Generated 3D textures, station materials, Earth Guardian textures and runtime Canvas textures are **visualization assets only**. They are never satellite evidence and are never substituted for NASA/USGS/Copernicus source products.
- Owner-supplied Cube source models/textures may be selected locally in the browser for the owner-reference intake. They are not automatically uploaded, published, relicensed or included in this repository. Redistribution requires the owner's rights/authorization for each file.

## Trademark and endorsement boundary

Provider names such as NASA, USGS, Copernicus, ESA, OpenStreetMap, Shopify, GitHub and Google Chrome identify data/services or compatibility targets. Their appearance does not imply sponsorship or endorsement of ForgeMCP unless explicitly stated by the provider. Provider logos/trademarks are not required for the judged workflow.

## Demo-video rule

The competition demo should contain only ForgeMCP/project-owned visuals, permitted screen recordings of the running application, and narration/audio the entrant has rights to use. Do not add copyrighted music or third-party promotional footage without permission.

## Operational rule

If a provider's terms, availability, license or attribution requirement cannot be confirmed for a specific source, ForgeMCP must fail closed: keep the integration labelled `NOT_CONNECTED`, `INSUFFICIENT_DATA`, reference-only, or remove it from the judged path rather than invent authorization or provenance.
