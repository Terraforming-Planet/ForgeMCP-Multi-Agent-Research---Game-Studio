# LabMCP TEST 001 — forest pond near Lake Kuchnia

## Pre-registered scope

- AOI centre: `53.591400, 19.010717`
- AOI: `2 × 2 km`, working CRS `EPSG:2180`
- Time scope: `1990–2026`; 2026 is a partial final year
- Question: is there a source-backed state-change signal, and which competing hydrological hypotheses deserve fresh EO and ground checks?

## What the recorded evidence supports

The public TEST 001 measurement supports a historical open-water state change. Its central persistent historical footprint is `17,722.2 m²` (`1.7722 ha`), the repeat-supported range is `16,269.3–21,642.0 m²`, the broad historical envelope is `23,978.3 m²`, and the 1990 overlap with the central consensus is `92.528%`.

The same record does **not** publish an exact residual 2026 open-water area or exact loss percentage and does not establish a cause. The older approximately `2.5 ha` estimate is retained only as an upper visual hypothesis, not the central result. The separate field report is an author observation and is not independent hydrological or official infrastructure verification.

Therefore the LabMCP result is:

- recorded signal: `ANOMALOUS_RECORDED`
- current environmental interpretation: `HYPOTHESIS`
- QA: `WARNING`
- verified finding: **none**

## Toruń reference resolution

No exact dataset named “Toruń” is silently substituted. The PZW central registry is a plausible candidate because it lists Kuchnia under the PZW District in Toruń and shows a size entry of `49.5`, but the visible page supplies neither the unit nor a hydrological time series. A 2025 retention expertise reports `56.9 ha`, which is not directly comparable without resolving definitions and lineage. Vistula TEST 014 confirms dataset integrity/coverage only; it makes no environmental-finding, water-loss or causal claim.

Numerical comparison remains blocked until a human supplies the exact URI/station ID, variable, unit, spatial scope, time range and licence.

## Global analogue protocol

The handler fetches the eight current public water-casebook JSON catalogues, keeps validated records with source links, deduplicates them, ranks mechanism terms deterministically and returns 12–16 cases. It first limits selection to one case per primary country, then fills any remainder. Every result is labelled `CONTEXT_ONLY`.

Analogues can make mechanisms plausible; they cannot prove a local cause. In particular, an outflow obstruction by itself usually tends to raise upstream water level. Drying is more consistent with hypotheses such as reduced/diverted inflow, a new outlet or breach, increased infiltration, abstraction, reduced recharge, vegetation/sediment change, or measurement limitations—each still requiring local evidence.

## Required next evidence

1. Resolve the exact Toruń reference asset and its measurement semantics.
2. Run fresh same-season Sentinel-2 L2A and same-orbit Sentinel-1 GRD comparisons for the pond, Lake Kuchnia, inflow and outflow as separate geometries.
3. Add regional precipitation/PET context without treating coarse reanalysis as a pond measurement.
4. Inspect official drainage, culvert, ditch, abstraction and water-management records.
5. Collect fixed-GPS photos, water level, inflow/outflow and above/below-obstruction measurements. Do not modify infrastructure without the responsible authority.

## Sources

- [TEST 001 measurement JSON](https://raw.githubusercontent.com/Terraforming-Planet/Polar-Sun-Moon-Analysis/annual-best-53-591400-19-010717/experiments/experiment_001_pond_forest_kuchnia/measurements_visible_pond_consensus/visible_pond_consensus_measurement.json)
- [TEST 001 field report](https://terraforming-planet.github.io/Polar-Sun-Moon-Analysis/published/experiment-001/field-observation-report.json)
- [Vistula TEST 014](https://terraforming-planet.github.io/Polar-Sun-Moon-Analysis/published/agentic-eo/vistula-test-014-live.json)
- [PZW registry candidate: Kuchnia](https://olsztyn.pzw.pl/strefa-wedkarza/lowiska-i-wody-pzw/kuchnia_N0FxEj7ynARay6kbTb5M)
- [Ministry response to interpellation 7015](https://orka2.sejm.gov.pl/IZ3.nsf/main/7C0A9E99)
- [Gardeja planning justification](https://gardeja.biuletyn.net/fls/bip_pliki/2020_12/BIPOLD000849/849.pdf)
- [2025 Grudziądz County retention expertise](https://www.kpodr.pl/wp-content/uploads/2026/01/Powiat-Grudziadzki-Wyznaczanie-priorytetowych-inwestycji-z-zakresu-retencji-wodnej_ITP.pdf)
