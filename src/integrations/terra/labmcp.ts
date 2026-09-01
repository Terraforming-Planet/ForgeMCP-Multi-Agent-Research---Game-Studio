import type { ProvenanceRecord, VerificationResult } from '../../types/core'

export const TEST_001_AOI = {
  id: 'terra-test-001-forest-pond-kuchnia',
  name: 'Forest Pond near Lake Kuchnia',
  center: { lat: 53.5914, lon: 19.010717 },
  widthM: 2_000,
  heightM: 2_000,
  workingCrs: 'EPSG:2180',
  catalogBboxWgs84Approx: [18.995582, 53.582417, 19.025852, 53.600383] as const,
  temporalScope: { start: '1990-01-01', end: '2026-09-01', partialFinalYear: true },
} as const

export const TEST_001_MEASUREMENT_URL =
  'https://raw.githubusercontent.com/Terraforming-Planet/Polar-Sun-Moon-Analysis/annual-best-53-591400-19-010717/experiments/experiment_001_pond_forest_kuchnia/measurements_visible_pond_consensus/visible_pond_consensus_measurement.json'
export const TEST_001_FIELD_REPORT_URL =
  'https://terraforming-planet.github.io/Polar-Sun-Moon-Analysis/published/experiment-001/field-observation-report.json'
export const VISTULA_REFERENCE_URL =
  'https://terraforming-planet.github.io/Polar-Sun-Moon-Analysis/published/agentic-eo/vistula-test-014-live.json'
export const PZW_KUCHNIA_REFERENCE_URL =
  'https://olsztyn.pzw.pl/strefa-wedkarza/lowiska-i-wody-pzw/kuchnia_N0FxEj7ynARay6kbTb5M'
export const SEJM_KUCHNIA_FLOW_RESPONSE_URL = 'https://orka2.sejm.gov.pl/IZ3.nsf/main/7C0A9E99'
export const SEJM_KUCHNIA_INTERPELLATION_URL = 'https://orka2.sejm.gov.pl/IZ3.nsf/main/24C4FC9C'
export const GARDEJA_MPZP_KUCHNIA_URL = 'https://gardeja.biuletyn.net/fls/bip_pliki/2020_12/BIPOLD000849/849.pdf'
export const GRUDZIADZ_RETENTION_EXPERTISE_URL =
  'https://www.kpodr.pl/wp-content/uploads/2026/01/Powiat-Grudziadzki-Wyznaczanie-priorytetowych-inwestycji-z-zakresu-retencji-wodnej_ITP.pdf'

export const GLOBAL_CASEBOOK_URLS = [
  'https://terraforming-planet.github.io/Polar-Sun-Moon-Analysis/data/hydrology/global-water-casebook.json',
  ...Array.from({ length: 7 }, (_, index) =>
    `https://terraforming-planet.github.io/Polar-Sun-Moon-Analysis/data/hydrology/global-water-casebook-batch-${String(index + 3).padStart(2, '0')}.json`,
  ),
] as const

type PondMeasurement = {
  method?: string
  historical_consensus_years?: number[]
  recommended_working_measurement?: {
    persistent_historical_visible_footprint_m2?: number
    persistent_historical_visible_footprint_ha?: number
    conservative_lower_m2?: number
    repeat_supported_upper_m2?: number
    broad_union_upper_m2?: number
    '1990_overlap_fraction'?: number
    '2026_open_water_area_m2'?: number | null
    '2026_state'?: string
    loss_percent_status?: string
  }
  interpretation?: {
    old_2_5ha_statement?: string
    current_central_result?: string
    precision_warning?: string
  }
}

type FieldReport = {
  test_id?: string
  reported_at_utc?: string
  evidence_class?: string
  independently_verified?: boolean
  official_documentary_record_attached?: boolean
  causal_claim?: boolean
  repair_effect_claim?: boolean
  observations_reported_by_author?: string[]
  interpretation_constraints?: string[]
  recommended_official_follow_up?: string[]
}

type VistulaReference = {
  run_metadata?: { timestamp_utc?: string; git_sha?: string; live_openai_agents_sdk_run?: boolean }
  case_id?: string
  deterministic_claim_verification?: {
    evidence_class?: string
    record_count?: number
    accepted_count?: number
    environmental_finding_claim?: boolean
    water_loss_claim?: boolean
    causal_claim?: boolean
    limitations?: string[]
  }
  deterministic_registry_selection?: { matches?: Array<{ id?: string; mission?: string; limitations?: string }> }
}

export type GlobalWaterCase = {
  id: string
  name: string
  countries: string[]
  record_status: string
  case_type: string
  mechanisms: string[]
  observed_pattern?: string
  management_lesson?: string
  source_urls: string[]
  evidence_class: string
  analogueScore?: number
  transferability?: 'CONTEXT_ONLY'
}

type Casebook = { generated_at_utc?: string; cases?: GlobalWaterCase[] }

export type Test001Evidence = {
  classification: 'ANOMALY'
  executionMode: 'RECORDED_EVIDENCE_LIVE_RETRIEVAL'
  freshEoAnalysisExecuted: false
  aoi: typeof TEST_001_AOI
  recordedResult: {
    stateChangeSupported: true
    historicalPersistentFootprintM2: number
    historicalPersistentFootprintHa: number
    repeatSupportedRangeM2: [number, number]
    broadHistoricalUpperEnvelopeM2: number
    overlap1990WithCentralConsensusPercent: number
    openWaterArea2026M2: null
    exactLossPercentPublished: false
    causeEstablished: false
    sourceMethod: string
    sourceYears: number[]
  }
  fieldContext: {
    evidenceClass: string
    independentlyVerified: boolean
    officialRecordAttached: boolean
    causalClaim: boolean
    repairEffectClaim: boolean
    observations: string[]
    constraints: string[]
  }
  uncertainties: string[]
  provenance: ProvenanceRecord[]
}

export type ReferenceResolution = {
  status: 'REFERENCE_DATASET_UNRESOLVED'
  requestedQuery: string
  automaticSelectionMade: false
  candidates: Array<{
    id: string
    title: string
    datasetType: string
    spatialScope: string
    temporalScope: string
    variables: string[]
    unit: string | null
    recordCount?: number
    acceptedCount?: number
    queryNameFoundInMetadata: boolean
    environmentalFindingClaim?: boolean
    waterLossClaim?: boolean
    causalClaim?: boolean
    compatibility: 'CANDIDATE_ONLY' | 'METHODOLOGY_CONTEXT_ONLY'
    retrievalMode: 'LIVE_JSON_RETRIEVAL' | 'CURATED_SOURCE_REFERENCE'
    sourceUrl: string
  }>
  comparisonFinding: string
  requiredHumanAction: string
  provenance: ProvenanceRecord[]
}

export type AnalogueSearch = {
  searchedCatalogs: number
  loadedCatalogs: number
  failedCatalogs: string[]
  searchedCases: number
  selectedCases: GlobalWaterCase[]
  excludedCount: number
  selectionPolicy: string
  transferability: 'CONTEXT_ONLY'
  provenance: ProvenanceRecord[]
}

export type ConnectivityContextItem = {
  classification: 'HISTORICAL_CLAIM' | 'HISTORICAL_OFFICIAL_FINDING' | 'HISTORICAL_PLANNING_CONTEXT' | 'RECENT_TECHNICAL_CONTEXT'
  statement: string
  sourceTitle: string
  sourceUrl: string
  contentLocator: string
  limitation: string
  retrievalMode: 'CURATED_SOURCE_REFERENCE'
}

export type LabMcpTest001Result = {
  schemaVersion: '1.0'
  runId: string
  requestedAt: string
  completedAt: string
  workflowVersion: 'labmcp-test-001-v1'
  executionMode: 'RECORDED_EVIDENCE_LIVE_RETRIEVAL'
  environmentalState: 'HYPOTHESIS'
  signalState: 'ANOMALOUS_RECORDED'
  qaStatus: 'WARNING'
  humanApproval: 'NOT_REQUESTED'
  agents: Array<{ name: string; role: string; status: 'PASS' | 'WARNING' }>
  tools: string[]
  evidence: Test001Evidence
  reference: ReferenceResolution
  connectivityContext: ConnectivityContextItem[]
  analogues: AnalogueSearch
  hypothesisMatrix: Array<{ id: string; hypothesis: string; evidence: 'SUPPORTS' | 'CONTRADICTS' | 'MISSING'; reason: string }>
  verification: VerificationResult
  proposedActions: string[]
  conclusion: string
  provenance: ProvenanceRecord[]
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' })
  if (!response.ok) throw new Error(`Evidence source HTTP ${response.status}: ${url}`)
  return response.json() as Promise<T>
}

function provenance(dataset: string, url: string, operation: string, requestParameters: Record<string, unknown>): ProvenanceRecord {
  const now = new Date().toISOString()
  return {
    provider: 'Terraforming Planet public evidence repository',
    dataset,
    aoi: `${TEST_001_AOI.center.lat},${TEST_001_AOI.center.lon}; ${TEST_001_AOI.widthM}x${TEST_001_AOI.heightM}m`,
    dateTime: now,
    operation,
    tool: operation,
    timestamp: now,
    uncertainty: 'Live retrieval of a recorded public result; not a fresh satellite-processing run.',
    requestParameters: { ...requestParameters, sourceUrl: url },
  }
}

function curatedSourceProvenance(provider: string, dataset: string, url: string, operation: string, requestParameters: Record<string, unknown>): ProvenanceRecord {
  const now = new Date().toISOString()
  return {
    provider,
    dataset,
    aoi: `${TEST_001_AOI.center.lat},${TEST_001_AOI.center.lon}; documentary context outside/around the AOI`,
    dateTime: now,
    operation,
    tool: operation,
    timestamp: now,
    uncertainty: 'Curated public-source reference. This browser handler links the source but does not fetch or revalidate its page/PDF content during the run.',
    requestParameters: { ...requestParameters, sourceUrl: url, retrievalMode: 'CURATED_SOURCE_REFERENCE' },
  }
}

function finite(value: unknown, label: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Invalid recorded measurement: ${label}`)
  return value
}

export async function inspectTest001Evidence(): Promise<Test001Evidence> {
  const [measurement, field] = await Promise.all([
    fetchJson<PondMeasurement>(TEST_001_MEASUREMENT_URL),
    fetchJson<FieldReport>(TEST_001_FIELD_REPORT_URL),
  ])
  const recorded = measurement.recommended_working_measurement
  if (!recorded || recorded['2026_open_water_area_m2'] !== null) {
    throw new Error('TEST 001 evidence did not preserve the uncertainty-gated 2026 endpoint.')
  }

  const historicalM2 = finite(recorded.persistent_historical_visible_footprint_m2, 'historical footprint')
  const historicalHa = finite(recorded.persistent_historical_visible_footprint_ha, 'historical footprint ha')
  const lowerM2 = finite(recorded.conservative_lower_m2, 'repeat-supported lower bound')
  const upperM2 = finite(recorded.repeat_supported_upper_m2, 'repeat-supported upper bound')
  const broadM2 = finite(recorded.broad_union_upper_m2, 'broad historical envelope')
  const overlap = finite(recorded['1990_overlap_fraction'], '1990 overlap') * 100

  return {
    classification: 'ANOMALY',
    executionMode: 'RECORDED_EVIDENCE_LIVE_RETRIEVAL',
    freshEoAnalysisExecuted: false,
    aoi: TEST_001_AOI,
    recordedResult: {
      stateChangeSupported: true,
      historicalPersistentFootprintM2: historicalM2,
      historicalPersistentFootprintHa: historicalHa,
      repeatSupportedRangeM2: [lowerM2, upperM2],
      broadHistoricalUpperEnvelopeM2: broadM2,
      overlap1990WithCentralConsensusPercent: overlap,
      openWaterArea2026M2: null,
      exactLossPercentPublished: false,
      causeEstablished: false,
      sourceMethod: measurement.method ?? 'Recorded multi-year visible-footprint consensus',
      sourceYears: measurement.historical_consensus_years ?? [],
    },
    fieldContext: {
      evidenceClass: field.evidence_class ?? 'AUTHOR_FIELD_OBSERVATION',
      independentlyVerified: field.independently_verified === true,
      officialRecordAttached: field.official_documentary_record_attached === true,
      causalClaim: field.causal_claim === true,
      repairEffectClaim: field.repair_effect_claim === true,
      observations: field.observations_reported_by_author ?? [],
      constraints: field.interpretation_constraints ?? [],
    },
    uncertainties: [
      measurement.interpretation?.precision_warning ?? 'Historical Landsat resolution limits small-pond precision.',
      recorded['2026_state'] ?? 'Exact residual open-water area in 2026 is not published.',
      'The former approximately 2.5 ha estimate is an upper visual hypothesis, not the central result.',
      'The field report is not independent hydrological or official infrastructure verification.',
      'No local cause is established by the recorded satellite result.',
    ],
    provenance: [
      provenance('TEST 001 visible pond consensus measurement', TEST_001_MEASUREMENT_URL, 'inspect_test_001_evidence', { branch: 'annual-best-53-591400-19-010717' }),
      provenance('TEST 001 author field observation report', TEST_001_FIELD_REPORT_URL, 'inspect_test_001_evidence', { reportedAtUtc: field.reported_at_utc ?? '2026-08-20' }),
    ],
  }
}

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export async function resolveReferenceDataset(query = 'Toruń'): Promise<ReferenceResolution> {
  const reference = await fetchJson<VistulaReference>(VISTULA_REFERENCE_URL)
  const verification = reference.deterministic_claim_verification
  const queryFound = normalize(JSON.stringify(reference)).includes(normalize(query))

  return {
    status: 'REFERENCE_DATASET_UNRESOLVED',
    requestedQuery: query,
    automaticSelectionMade: false,
    candidates: [
      {
        id: 'pzw-central-water-registry-kuchnia',
        title: 'PZW central water registry — Kuchnia',
        datasetType: 'Fishery/water-body registry record',
        spatialScope: 'Kuchnia, Rogóźno, Grudziądz County; affiliation: PZW District in Toruń',
        temporalScope: 'Current public catalogue record; no hydrological time series supplied',
        variables: ['water-body type', 'place', 'administrative affiliation', 'fishery size entry: 49.5'],
        unit: null,
        queryNameFoundInMetadata: normalize('Okręg PZW w Toruniu').includes(normalize(query)),
        compatibility: 'CANDIDATE_ONLY',
        retrievalMode: 'CURATED_SOURCE_REFERENCE',
        sourceUrl: PZW_KUCHNIA_REFERENCE_URL,
      },
      {
        id: reference.case_id ?? 'vistula-test-014',
        title: 'Vistula TEST 014 — Gniew–Grudziądz',
        datasetType: 'Satellite test-set integrity and temporal-coverage record',
        spatialScope: 'Vistula Gniew–Grudziądz; reported extent 45 × 70 km',
        temporalScope: '1990–2026; spring and autumn',
        variables: ['scene integrity', 'temporal coverage', 'platform', 'item ID', 'source scene key', 'hashes'],
        unit: null,
        recordCount: verification?.record_count ?? 0,
        acceptedCount: verification?.accepted_count ?? 0,
        queryNameFoundInMetadata: queryFound,
        environmentalFindingClaim: verification?.environmental_finding_claim === true,
        waterLossClaim: verification?.water_loss_claim === true,
        causalClaim: verification?.causal_claim === true,
        compatibility: 'METHODOLOGY_CONTEXT_ONLY',
        retrievalMode: 'LIVE_JSON_RETRIEVAL',
        sourceUrl: VISTULA_REFERENCE_URL,
      },
    ],
    comparisonFinding: 'A plausible “Toruń database” candidate now exists: the PZW central registry lists Kuchnia under the PZW District in Toruń and shows a size entry of 49.5, but the visible record does not state the unit or provide a hydrological time series. Vistula TEST 014 remains methodology context only. Neither record numerically confirms the TEST 001 pond change or its cause.',
    requiredHumanAction: 'Select the exact Toruń dataset by URI/station ID, measured variable, unit, time range, catchment and licence before numerical comparison.',
    provenance: [provenance('Vistula TEST 014 live Agentic EO record', VISTULA_REFERENCE_URL, 'resolve_reference_dataset', { query, queryFound })],
  }
}

const DEFAULT_ANALOGUE_TERMS = [
  'shallow', 'dry', 'drought', 'inflow', 'channel', 'drain', 'connect', 'groundwater', 'diversion', 'outlet', 'water use',
]

function caseScore(item: GlobalWaterCase, terms: string[]) {
  const primary = normalize([item.case_type, ...(item.mechanisms ?? [])].join(' '))
  const secondary = normalize([item.observed_pattern ?? '', item.management_lesson ?? ''].join(' '))
  return terms.reduce((score, term) => {
    const needle = normalize(term)
    return score + (primary.includes(needle) ? 3 : 0) + (secondary.includes(needle) ? 1 : 0)
  }, 0)
}

export async function findGlobalWaterAnalogues(limit = 12, terms = DEFAULT_ANALOGUE_TERMS): Promise<AnalogueSearch> {
  const boundedLimit = Math.min(16, Math.max(12, Math.trunc(limit)))
  const settled = await Promise.allSettled(GLOBAL_CASEBOOK_URLS.map(async url => ({ url, data: await fetchJson<Casebook>(url) })))
  const loaded = settled.filter((item): item is PromiseFulfilledResult<{ url: string; data: Casebook }> => item.status === 'fulfilled')
  const failed = settled.flatMap((item, index) => item.status === 'rejected' ? [GLOBAL_CASEBOOK_URLS[index]] : [])
  if (!loaded.length) throw new Error('No global water casebook could be loaded.')

  const unique = new Map<string, GlobalWaterCase>()
  for (const source of loaded) {
    for (const item of source.value.data.cases ?? []) {
      if (item?.id && item.record_status === 'validated_case' && Array.isArray(item.source_urls) && item.source_urls.length) unique.set(item.id, item)
    }
  }

  const ranked = [...unique.values()]
    .map(item => ({ ...item, analogueScore: caseScore(item, terms), transferability: 'CONTEXT_ONLY' as const }))
    .sort((left, right) => (right.analogueScore ?? 0) - (left.analogueScore ?? 0) || left.id.localeCompare(right.id))

  const selected: GlobalWaterCase[] = []
  const countryCounts = new Map<string, number>()
  for (const item of ranked) {
    const primaryCountry = item.countries?.[0] ?? 'Unknown'
    if ((countryCounts.get(primaryCountry) ?? 0) >= 1) continue
    selected.push(item)
    countryCounts.set(primaryCountry, 1)
    if (selected.length === boundedLimit) break
  }
  for (const item of ranked) {
    if (selected.length === boundedLimit) break
    if (!selected.some(current => current.id === item.id)) selected.push(item)
  }

  const now = new Date().toISOString()
  return {
    searchedCatalogs: GLOBAL_CASEBOOK_URLS.length,
    loadedCatalogs: loaded.length,
    failedCatalogs: failed,
    searchedCases: unique.size,
    selectedCases: selected,
    excludedCount: Math.max(0, unique.size - selected.length),
    selectionPolicy: `Deterministic keyword ranking over validated cases only; one case per primary country before fallback; ${boundedLimit} returned; no local-cause transfer. Terms: ${terms.join(', ')}.`,
    transferability: 'CONTEXT_ONLY',
    provenance: loaded.map(source => ({
      provider: 'Terraforming Planet global water casebook',
      dataset: source.value.data.generated_at_utc ? `Validated hydrology cases (${source.value.data.generated_at_utc})` : 'Validated hydrology cases',
      aoi: 'Global case catalogue',
      dateTime: now,
      operation: 'find_global_water_analogues',
      tool: 'find_global_water_analogues',
      timestamp: now,
      uncertainty: 'Analogues provide mechanism context only and cannot establish a cause at TEST 001.',
      requestParameters: { sourceUrl: source.value.url, terms, limit: boundedLimit },
    })),
  }
}

export function inspectLocalHydrologyContext(): ConnectivityContextItem[] {
  return [
    {
      classification: 'HISTORICAL_OFFICIAL_FINDING',
      statement: 'A Ministry of Environment response to parliamentary interpellation 7015 states that Lake Kuchnia is flow-through because the Gardęga River enters and leaves the lake.',
      sourceTitle: 'Response to interpellation no. 7015 (Third Sejm term)',
      sourceUrl: SEJM_KUCHNIA_FLOW_RESPONSE_URL,
      contentLocator: 'Phrase: “Kuchnia jest jeziorem przepływowym…”',
      limitation: 'This supports historical/documentary hydrological topology. It does not establish the present flow, an obstruction, a hazard severity or the cause of the forest-pond change.',
      retrievalMode: 'CURATED_SOURCE_REFERENCE',
    },
    {
      classification: 'HISTORICAL_CLAIM',
      statement: 'The underlying 2001 interpellation describes Lake Kuchnia as a roughly 54 ha flow-through lake on the Gardęga–Osa–Vistula network.',
      sourceTitle: 'Interpellation no. 7015, 20 August 2001',
      sourceUrl: SEJM_KUCHNIA_INTERPELLATION_URL,
      contentLocator: 'Interpellation body, Lake Kuchnia paragraph',
      limitation: 'An interpellation is a parliamentary question, not a current measurement. The ministry response is the stronger source for the flow-through classification.',
      retrievalMode: 'CURATED_SOURCE_REFERENCE',
    },
    {
      classification: 'HISTORICAL_PLANNING_CONTEXT',
      statement: 'The 2009 municipal spatial-plan justification describes Kuchnia as a flow-through lake connected with Lake Nogat by the Gardęga River and records the adjacent forest/protected-landscape context.',
      sourceTitle: 'Gardeja Municipal Council resolution XXXI/199/2009 — planning justification',
      sourceUrl: GARDEJA_MPZP_KUCHNIA_URL,
      contentLocator: 'UZASADNIENIE, PDF pages 7–8',
      limitation: 'A planning justification is not a hydrological measurement and does not establish present-day channel continuity.',
      retrievalMode: 'CURATED_SOURCE_REFERENCE',
    },
    {
      classification: 'RECENT_TECHNICAL_CONTEXT',
      statement: 'A December 2025 retention-planning expertise reports Lake Kuchnia at 56.9 ha, capacity 1,299.6 thousand m³, catchment 282.2 km² and describes it as strongly flow-through in the Gardęga catchment, with estimated exchange about 30 times per year.',
      sourceTitle: 'Small-retention investment expertise for Grudziądz County',
      sourceUrl: GRUDZIADZ_RETENTION_EXPERTISE_URL,
      contentLocator: 'PDF pages 24–25 (printed pages 21–22)',
      limitation: 'This is planning/technical context; the Kuchnia paragraph does not expose a raw measurement series or uncertainty for the exchange estimate. It does not confirm a current obstruction or the TEST 001 pond cause.',
      retrievalMode: 'CURATED_SOURCE_REFERENCE',
    },
  ]
}

export async function runLabMcpTest001(input: { referenceQuery?: string; analogueLimit?: number } = {}): Promise<LabMcpTest001Result> {
  const requestedAt = new Date().toISOString()
  const [evidence, reference, analogues] = await Promise.all([
    inspectTest001Evidence(),
    resolveReferenceDataset(input.referenceQuery ?? 'Toruń'),
    findGlobalWaterAnalogues(input.analogueLimit ?? 12),
  ])

  const agents: LabMcpTest001Result['agents'] = [
    { name: 'Terra Agentic EO Coordinator', role: 'Routes the bounded research workflow.', status: 'PASS' },
    { name: 'EO Source Scout (ESA/Copernicus-oriented)', role: 'Checks sensor lineage and official-source limits; this is not an ESA-operated agent.', status: 'PASS' },
    { name: 'Toruń Reference Resolver', role: 'Refuses an unverified reference-dataset substitution.', status: 'WARNING' },
    { name: 'Global Analogue Scout', role: `Searches ${analogues.searchedCases} live public validated hydrology cases deterministically.`, status: analogues.failedCatalogs.length ? 'WARNING' : 'PASS' },
    { name: 'Hydrology Connectivity Analyst', role: 'Separates curated historical drainage-network references from current flow evidence.', status: 'WARNING' },
    { name: 'EO Evidence Verifier', role: 'Keeps the recorded state change separate from causal hypotheses.', status: 'WARNING' },
    { name: 'Ground Verification Planner', role: 'Defines field evidence required before any causal claim.', status: 'PASS' },
  ]

  const verification: VerificationResult = {
    state: 'WARNING',
    checks: [
      'TEST 001 recorded measurement loaded from its public evidence branch',
      'Author field report kept as a separate, unverified evidence class',
      `${analogues.searchedCases} validated catalogue cases searched; ${analogues.selectedCases.length} context analogues returned`,
      'Toruń reference was not auto-selected from incompatible metadata',
      'Cause and exact 2026 loss percentage remain unset',
    ],
    evidenceReferences: [TEST_001_MEASUREMENT_URL, TEST_001_FIELD_REPORT_URL, VISTULA_REFERENCE_URL, ...analogues.provenance.map(item => String(item.requestParameters.sourceUrl))],
    uncertainties: [
      ...evidence.uncertainties,
      'No fresh CDSE/USGS processing job was executed in this browser run.',
      'Global analogues are context only, not local causal evidence.',
      'The requested Toruń reference dataset remains unresolved.',
      'Ground/in-situ hydrology is absent.',
    ],
    timestamp: new Date().toISOString(),
    reason: 'The historical open-water state-change signal is recorded and source-backed, but a current hazard level and local hydrological cause are not verified.',
  }

  return {
    schemaVersion: '1.0',
    runId: crypto.randomUUID(),
    requestedAt,
    completedAt: new Date().toISOString(),
    workflowVersion: 'labmcp-test-001-v1',
    executionMode: 'RECORDED_EVIDENCE_LIVE_RETRIEVAL',
    environmentalState: 'HYPOTHESIS',
    signalState: 'ANOMALOUS_RECORDED',
    qaStatus: 'WARNING',
    humanApproval: 'NOT_REQUESTED',
    agents,
    tools: ['inspect_test_001_evidence', 'resolve_reference_dataset', 'find_global_water_analogues', 'inspect_local_hydrology_context', 'verify_evidence'],
    evidence,
    reference,
    connectivityContext: inspectLocalHydrologyContext(),
    analogues,
    hypothesisMatrix: [
      { id: 'H0', hypothesis: 'Seasonality or measurement uncertainty explains the whole signal.', evidence: 'CONTRADICTS', reason: 'The recorded footprint is repeat-supported across multiple historical years, but the exact 2026 endpoint remains uncertainty-gated.' },
      { id: 'H1', hypothesis: 'Regional precipitation/PET deficit explains the change.', evidence: 'MISSING', reason: 'No matched ERA5-Land, E-OBS or local meteorological comparison was executed in this run.' },
      { id: 'H2', hypothesis: 'Local inflow/outflow connectivity changed.', evidence: 'MISSING', reason: 'The author report motivates the test but is not independent infrastructure or flow evidence.' },
      { id: 'H3', hypothesis: 'Drainage, abstraction or land-use change contributed.', evidence: 'MISSING', reason: 'Official infrastructure chronology, permits and groundwater observations are not attached.' },
      { id: 'H4', hypothesis: 'Sedimentation or vegetation succession reduced open water.', evidence: 'MISSING', reason: 'No sediment, bathymetry or classified vegetation series was executed.' },
      { id: 'H5', hypothesis: 'Cloud, forest shadow, mixed pixels or sensor change created the apparent signal.', evidence: 'CONTRADICTS', reason: 'Multi-year repeat support weakens a single-scene artefact explanation, but canopy and 30 m Landsat limits still require S1/S2 and field checks.' },
    ],
    verification,
    proposedActions: [
      'Resolve the exact Toruń dataset by station/asset ID, variable, unit, catchment, time range and licence.',
      'Run a fresh same-season Sentinel-2 L2A and same-orbit Sentinel-1 GRD comparison for the pond, Lake Kuchnia, inflow and outflow as separate geometries.',
      'Add regional precipitation/PET context without resampling it into a fake local pond measurement.',
      'Inspect official hydrology, drainage, culvert, ditch and water-management records.',
      'Collect fixed-GPS photos, water level, inflow/outflow and above/below-obstruction measurements; do not remove any obstruction without the responsible authority.',
    ],
    conclusion: 'Confirmed: the public TEST 001 record supports a historical open-water state change. Not confirmed: an exact 2026 loss percentage, a current hazard severity, a Toruń comparison, or any cause. The correct LabMCP output is HYPOTHESIS with QA WARNING, not VERIFIED FINDING.',
    provenance: [
      ...evidence.provenance,
      ...reference.provenance,
      ...analogues.provenance,
      curatedSourceProvenance('Polish Angling Association (PZW)', 'PZW central registry candidate for Lake Kuchnia', PZW_KUCHNIA_REFERENCE_URL, 'resolve_reference_dataset', { query: input.referenceQuery ?? 'Toruń', automaticSelectionMade: false, sizeEntry: 49.5, unit: null }),
      curatedSourceProvenance('Sejm of the Republic of Poland archive', 'Sejm archive response on Lake Kuchnia flow-through topology', SEJM_KUCHNIA_FLOW_RESPONSE_URL, 'inspect_local_hydrology', { claimScope: 'historical topology only' }),
      curatedSourceProvenance('Sejm of the Republic of Poland archive', 'Sejm archive interpellation no. 7015', SEJM_KUCHNIA_INTERPELLATION_URL, 'inspect_local_hydrology', { claimScope: 'historical documentary context only' }),
      curatedSourceProvenance('Gardeja Municipality public information bulletin', 'Gardeja spatial-plan justification for Lake Kuchnia/Gardęga', GARDEJA_MPZP_KUCHNIA_URL, 'inspect_local_hydrology', { contentLocator: 'UZASADNIENIE, PDF pages 7–8', claimScope: 'historical planning context' }),
      curatedSourceProvenance('Kujawsko-Pomorski Agricultural Advisory Centre', '2025 Grudziądz County small-retention expertise', GRUDZIADZ_RETENTION_EXPERTISE_URL, 'inspect_local_hydrology', { contentLocator: 'PDF pages 24–25', claimScope: 'recent technical context, not current observation' }),
    ],
  }
}
