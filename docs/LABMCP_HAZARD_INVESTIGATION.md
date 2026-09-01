# LabMCP — environmental hazard investigation

LabMCP is a user-directed environmental investigation workspace, not a one-case dashboard. The human selects or types a region and chooses an AOI radius, years, one comparison season, analysis depth, annual or representative imagery, and one or more hazard classes.

## What one run actually does

1. Uses supplied WGS84 coordinates or resolves the name through OpenStreetMap Nominatim. When a name has several matches, the first match and the number of alternatives are recorded; the user must confirm the AOI.
2. Calls the public Terra evidence Worker at `/research/analyze`. The Worker preflights official/public NASA GIBS and Copernicus imagery, retrieves USGS Landsat catalogue metadata, and sends only the accepted representative images to the analysis model.
3. Calls `/research/yearly-gallery` in bounded six-year batches. Each requested year gets either an official USGS Landsat browse image, a clearly labelled NASA GIBS fallback, or an explicit missing slot.
4. Retrieves Copernicus DEM GLO-90 raster samples through Open-Meteo and a recent NASA EONET context query. Neither source proves a local cause.
5. For water-related hazards, searches the validated global water casebooks and selects region-diverse analogues. Transferability is always `CONTEXT_ONLY`.
6. Creates competing hypotheses, the measurements needed to test them, an unsent preliminary-alert draft when the evidence gate permits it, and conditional technical options for monitoring, repair or regeneration.
7. Produces provenance, limitations and a field-verification plan.

## Evidence ladder

The workflow keeps these states distinct:

- `OBSERVATION`: a visible or measured input with source and limitations.
- `ANOMALY`: a source-backed deviation or state change, still without an automatic cause.
- `HYPOTHESIS`: a causal explanation that has required tests.
- `PRELIMINARY_RISK_ALERT`: an unsent draft that requires human review and the competent authority.
- `VERIFIED_FINDING`: locked during the normal investigation run. A separate approval-gated tool requires an independent expert, attached measurements, method, date, HTTPS source and literal human approval for one precisely scoped statement.
- `INSUFFICIENT_DATA`: the correct outcome when imagery or providers do not support a conclusion.

`ai_visual_image_count` is the only count of images actually inspected by the model. The annual gallery can contain many more source images, but they remain catalogue/control material until inspected. Metadata-only years, failed image slots and failed providers remain explicit.

## Hazard classes

The current contract supports water loss, inflow/outflow obstruction, terrain change, flood, snow avalanche, landslide, wildfire and coastal change. Each class has a competing hypothesis library, field checks and conditional actions. The options never authorize physical work; engineering design, ownership, permits, environmental review and the competent authority remain mandatory.

## TEST 001 preset

The forest pond near Lake Kuchnia at `53.591400, 19.010717` is a preset. It adds the recorded multi-year pond result, author field context, local connectivity references, global water analogues and the Toruń reference resolver. The recorded result supports a historical state change, but does not publish the exact residual open-water area or exact loss percentage in 2026 and does not establish a cause.

## ESA wording

“Copernicus/ESA Source Agent” is a ForgeMCP/Terra specialist that uses public Copernicus/ESA sources. It is not an agent operated, endorsed or certified by ESA.

## Alerting boundary

The app prepares a draft and lists the relevant audience category. It does not discover personal contacts, send messages, publish warnings, close roads, dispatch emergency services or order works. Those actions require a verified situation, the correct recipient, human approval and the legal authority responsible for the site.
