# Data Sources

## Current integrations in this stage

### OpenStreetMap Nominatim
- **Provider:** OpenStreetMap/Nominatim
- **Purpose:** AOI location search for Terra workflows
- **Data/Product:** Geocoding search results
- **Provenance:** Query string + timestamp recorded in workflow
- **Attribution/Licensing:** Subject to Nominatim/OSM usage terms

### NASA EONET
- **Provider:** NASA
- **Purpose:** Public environmental event observations for preliminary context
- **Data/Product:** EONET v3 events
- **Provenance:** Provider, dataset, operation, parameters, timestamp
- **Attribution/Licensing:** Third-party provider data; ForgeMCP does not own source data

### Terra TEST 001 public evidence
- **Provider:** Terraforming Planet public evidence repository
- **Purpose:** Recorded forest-pond state-change measurement and separately classified author field report
- **Data/Product:** Visible-pond consensus JSON and field-observation JSON
- **Runtime behavior:** Both JSON records are retrieved and validated during the LabMCP run; no fresh EO processing is claimed

### Terra global hydrology casebooks
- **Provider:** Terraforming Planet public evidence repository; cases retain their own official/scientific source links
- **Purpose:** Context-only analogue search across the current validated catalogue
- **Runtime behavior:** Eight public JSON catalogues are fetched; validated cases are deduplicated and ranked deterministically; 12–16 cases are returned with no local-cause transfer

### Vistula TEST 014
- **Purpose:** Candidate methodology and dataset-integrity context for the requested Toruń reference
- **Runtime behavior:** The public JSON is fetched, but it does not claim an environmental finding, water loss or causation

## Curated source references (linked, not re-fetched by the handler)
- PZW central registry record for Kuchnia, affiliated with the PZW District in Toruń
- Sejm interpellation 7015 and the Ministry response on historical flow-through topology
- Gardeja municipal spatial-plan justification
- 2025 Grudziądz County small-retention expertise

These references are labelled `CURATED_SOURCE_REFERENCE`. Their contents are not presented as live-revalidated observations.

## Referenced (not directly integrated yet)
- NASA GIBS
- ESA / Copernicus / CDSE
- USGS / Landsat
- NOAA
