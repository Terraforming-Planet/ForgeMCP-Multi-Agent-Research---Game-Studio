import type { EvidenceState, ProvenanceRecord, VerificationResult } from '../../types/core'
import { findObservations, getElevationProfile, searchLocation } from './adapter'
import {
  findGlobalWaterAnalogues,
  inspectLocalHydrologyContext,
  inspectTest001Evidence,
  resolveReferenceDataset,
  TEST_001_AOI,
  type AnalogueSearch,
  type ConnectivityContextItem,
  type ReferenceResolution,
  type Test001Evidence,
} from './labmcp'

export const TERRA_EVIDENCE_API_URL = 'https://terra-observation-evidence-explainer.xodobrox.workers.dev'

const TEST_001_CASE_ID = 'test-001-forest-pond-kuchnia' as const
const COORDINATE_TOLERANCE_DEGREES = 0.000001
const RADIUS_TOLERANCE_KM = 0.000001

export const HAZARD_TYPES = [
  'water-loss',
  'flow-obstruction',
  'terrain-change',
  'flood',
  'snow-avalanche',
  'landslide',
  'wildfire',
  'coastal-change',
] as const

export type HazardType = (typeof HAZARD_TYPES)[number]
export type InvestigationSeason = 'all' | 'spring' | 'summer' | 'autumn' | 'winter'
export type InvestigationDepth = 'screening' | 'deep'
export type TimelineMode = 'representative' | 'annual'
export type SpatialAnalysisMode = 'overview' | 'regional-patrol'

export type HazardInvestigationInput = {
  regionQuery: string
  latitude?: number
  longitude?: number
  radiusKm: number
  startYear: number
  endYear: number
  season: InvestigationSeason
  hazardTypes: HazardType[]
  depth: InvestigationDepth
  timelineMode: TimelineMode
  spatialMode?: SpatialAnalysisMode
  patrolTileCount?: number
  patrolFrameWidthKm?: number
  referenceQuery?: string
  caseId?: 'test-001-forest-pond-kuchnia'
  focusLatitude?: number
  focusLongitude?: number
  focusRadiusKm?: number
}

export type VisibleWaterExtrema = {
  status: 'ESTABLISHED' | 'INSUFFICIENT_EVIDENCE'
  most_visible_water_year: number | null
  least_visible_water_year: number | null
  compared_years: number[]
  method: 'QUALITATIVE_VISUAL_RANKING_OF_SUPPLIED_IMAGES'
  basis: string
}

export type HydrologyScreening = {
  water_change_state: 'VISIBLE_WATER_REDUCTION_CANDIDATE' | 'VISIBLE_WATER_INCREASE_CANDIDATE' | 'NO_VISIBLE_CHANGE_ESTABLISHED' | 'INSUFFICIENT_EVIDENCE'
  temporal_basis: string
  inflow_outflow_status: 'VISIBLE_CANDIDATES' | 'NO_CANDIDATE_VISIBLE' | 'INSUFFICIENT_EVIDENCE'
  candidate_features: string[]
  main_and_tributary_context: string
  required_checks: string[]
  cause_status: 'NOT_ESTABLISHED_FROM_SUPPLIED_EVIDENCE'
  visible_water_extrema?: VisibleWaterExtrema
}

export type Test001FocusEvidenceRecord = {
  case_id: 'test-001-forest-pond-kuchnia'
  evidence_revision: string
  target: {
    name: string
    latitude: number
    longitude: number
    requested_frame_width_m: number
    evidence_crop_width_m: number
    registration: 'SAME_FIXED_GEOGRAPHIC_TARGET'
  }
  historical_visible_footprint: {
    central_m2: number
    central_ha: number
    repeat_supported_range_m2: [number, number]
    repeat_supported_range_ha: [number, number]
    broad_union_upper_m2: number
    overlap_1990_with_central_consensus_percent: number
  }
  recorded_year_ranking: {
    most_visible_historical_component_year: number
    most_visible_historical_component_m2: number
    most_visible_historical_component_ha: number
    least_visible_endpoint_year: number
    interpretation: string
  }
  state_change: {
    status: 'NEAR_TOTAL_HISTORICAL_OPEN_WATER_STATE_TRANSITION_STRONGLY_SUPPORTED'
    approximate_disappeared_historical_footprint_m2: number
    approximate_disappeared_historical_footprint_ha: number
    exact_2026_open_water_area_m2: null
    exact_loss_percent: null
    cause_status: 'NOT_ESTABLISHED'
  }
  alert: {
    status: 'HIGH_PRIORITY_MONITORING_ANOMALY_REQUIRES_INVESTIGATION'
    delivery: 'NOT_SENT'
    field_verification_required: true
  }
  comparison_images: Array<{
    year: number
    role: string
    url: string
    image_authenticity?: 'DERIVED_ANALYTICAL_PRODUCT'
    product_kind?: string
    ai_generated?: false
    used_as_model_input?: false
  }>
  source_original_images?: Array<{
    year: number
    role: string
    url: string
    image_authenticity: 'ORIGINAL_OFFICIAL_SATELLITE_PRODUCT'
    product_kind: string
    ai_generated: false
    used_as_model_input: false
  }>
  method: string
}

export type WorkerAnalysisImage = {
  date: string
  source: string
  url: string
  high_resolution_aoi?: boolean
  evidence_role?: string | null
  nominal_resolution_m?: number | null
  cloud_cover?: number | null
  patrol_tile_id?: string | null
  tile_center_latitude?: number | null
  tile_center_longitude?: number | null
  tile_frame_width_km?: number | null
  image_authenticity?: 'ORIGINAL_OFFICIAL_SATELLITE_PRODUCT' | 'DERIVED_ANALYTICAL_PRODUCT' | 'AI_GENERATED_IMAGE'
  product_kind?: string | null
  ai_generated?: boolean
  used_as_model_input?: boolean
}

export type RegionalPatrolSummary = {
  status: 'COMPLETE_SPARSE_SCREENING' | 'PARTIAL_SPARSE_SCREENING' | 'UNAVAILABLE_HIGH_RESOLUTION_SOURCE' | 'NO_TILE_PASSED_PREFLIGHT'
  requested_tiles: number
  generated_tiles: number
  inspected_tiles: number
  frame_width_km: number
  source_date: string | null
  source: string | null
  nominal_resolution_m: number | null
  aoi_radius_km: number
  aoi_area_km2: number
  nominal_sampled_area_upper_bound_km2: number
  nominal_coverage_upper_bound_percent: number
  uninspected_area_lower_bound_percent: number
  full_coverage: false
  selection_method: 'DETERMINISTIC_GOLDEN_ANGLE_SPATIAL_STRATIFICATION_NOT_HYDROGRAPHY_TARGETED'
  temporal_scope: 'ONE_RECENT_HLS_DATE_SPATIAL_SCREENING'
  temporal_change_supported_by_patrol_alone: false
  tile_manifest: Array<{
    tile_id: string
    latitude: number
    longitude: number
    status: 'INSPECTED_BY_MODEL' | 'NOT_INSPECTED_PRECHECK_OR_BUDGET'
  }>
  limitations: string[]
}

export type RegionalPatrolAssessment = {
  status: 'NOT_REQUESTED' | 'COMPLETE_TILE_REVIEW' | 'PARTIAL_TILE_REVIEW' | 'INSUFFICIENT_EVIDENCE'
  overview: string
  inspected_tile_ids: string[]
  tiles_with_visible_open_water: string[]
  tiles_with_wetland_or_wet_soil: string[]
  tiles_with_possible_channel: string[]
  tiles_with_cloud_shadow_or_no_data: string[]
  tile_findings: Array<{
    tile_id: string
    surface_class: 'OPEN_WATER' | 'WETLAND_OR_WET_SOIL' | 'VEGETATION' | 'BARE_SOIL_OR_SEDIMENT' | 'BUILT_OR_MODIFIED_TERRAIN' | 'CLOUD_SHADOW_OR_NO_DATA' | 'MIXED_OR_UNCERTAIN'
    hydrology_feature: 'NONE_VISIBLE' | 'MAIN_WATERBODY' | 'POSSIBLE_INFLOW' | 'POSSIBLE_OUTFLOW' | 'SIDE_CHANNEL_OR_DITCH' | 'POSSIBLE_OBSTRUCTION_OR_CROSSING' | 'UNRESOLVED'
    observation: string
    confidence: 'low' | 'medium' | 'high'
  }>
  limitations: string[]
}

export type WorkerAreaAnalysis = {
  service: string
  generated_at_utc: string
  area: { place_name: string | null; latitude: number; longitude: number; radius_km: number }
  visual_focus?: { latitude: number; longitude: number; radius_km: number; frame_width_m: number; purpose: string; native_resolution_unchanged: true }
  period: { start_date: string; end_date: string }
  depth: 'quick' | 'deep'
  preview_images: WorkerAnalysisImage[]
  analysis_images?: WorkerAnalysisImage[]
  derived_images?: WorkerAnalysisImage[]
  ai_visual_image_count: number
  model_visual_image_count?: number
  imagery_authenticity_policy?: {
    model_input_rule: 'ORIGINAL_OFFICIAL_SATELLITE_PRODUCTS_ONLY'
    original_model_input_count: number
    derived_model_input_count: 0
    ai_generated_model_input_count: 0
    derived_display_only_count: number
    ai_generated_images_present: false
  }
  visual_preflight_warnings?: string[]
  landsat_catalog: {
    matched: number
    returned: number
    scenes: Array<{ id: string; date: string | null; platform: string | null; cloud_cover: number | null }>
    query_url: string | null
    full_catalog_url: string | null
    warning?: string
  }
  analysis: {
    headline: string
    what_is_visible: string
    change_over_time: string
    water_assessment: string
    hydrology_screening?: HydrologyScreening
    regional_patrol_assessment?: RegionalPatrolAssessment
    notable_features: string[]
    confidence: { level: 'low' | 'medium' | 'high'; reason: string }
    limitations: string[]
    recommended_next_step: string
  }
  test001_focus_evidence?: Test001FocusEvidenceRecord | null
  analysis_protocol?: {
    usage: string
    training_3: { streamed_windows: number; research_region_count: number; environmental_ground_truth: false }
    training_4: { unique_real_scientific_pairs: number; validation_pairs: number; steps: number; checkpoint_loaded_by_worker: false; environmental_ground_truth: false }
  }
  tp26_protocol?: {
    schema: string
    role: string
    source_ladder: Array<{ source: string; role: string; nominal_resolution: string; runtime_state?: string }>
    extrema_gate: string
  }
  water_extrema_readiness?: {
    status: 'INSUFFICIENT_RANKING_ELIGIBLE_YEARS' | 'MODEL_COMPARABILITY_GATE_APPLIED'
    small_waterbody_mode: boolean
    requires_high_resolution_aoi?: boolean
    high_resolution_aoi_images: number
    high_resolution_aoi_years?: number
    visually_supplied_images: number
  }
  regional_patrol?: RegionalPatrolSummary | null
  evidence_policy: string
}

export type YearlyImageSlot = {
  year: number
  status: 'image' | 'missing'
  image?: {
    year: number
    date: string
    source: string
    url: string
    original_url: string
    scene_id: string | null
    cloud_cover: number | null
    cloud_preference_met: boolean
    asset_kind?: 'FULL_RESOLUTION_BROWSE' | 'CATALOGUE_THUMBNAIL' | 'NASA_GIBS_AOI_FALLBACK' | 'NASA_WELD_30M_AOI' | 'NASA_HLS_L30_AOI'
    render_kind?: 'CATALOGUE_BROWSE' | 'NATURAL_COLOR_RGB'
    aoi_cropped?: boolean
    analysis_eligible?: boolean
    quality_note?: string
    image_authenticity?: 'ORIGINAL_OFFICIAL_SATELLITE_PRODUCT' | 'DERIVED_ANALYTICAL_PRODUCT' | 'AI_GENERATED_IMAGE'
    product_kind?: string
    ai_generated?: boolean
    used_as_model_input?: boolean
  }
  reason?: string
  warning?: string
}

type YearlyGalleryResponse = {
  service: string
  requested_years: number[]
  slots: YearlyImageSlot[]
  policy: string
}

export type SourceState = 'PASS' | 'WARNING' | 'NOT_CONNECTED' | 'INSUFFICIENT_DATA'

export type InvestigationSource = {
  id: string
  name: string
  provider: string
  state: SourceState
  role: string
  detail: string
  sourceUrl: string
}

export type InvestigationAgent = {
  name: string
  role: string
  tool: string
  status: SourceState
  result: string
}

export type InvestigationObservation = {
  evidenceClass: 'OBSERVATION' | 'ANOMALY' | 'CATALOGUE_METADATA' | 'CONTEXT_ONLY'
  statement: string
  source: string
  limitation: string
}

export type CausalHypothesis = {
  id: string
  hazardType: HazardType
  hypothesis: string
  status: 'UNTESTED' | 'VISIBLE_PATTERN_REQUIRES_TEST' | 'WEAKENED_NOT_EXCLUDED'
  priority: number
  supportingEvidence: string[]
  contradictingEvidence: string[]
  requiredChecks: string[]
}

export type PreliminaryAlertDraft = {
  evidenceClass: 'PRELIMINARY_RISK_ALERT' | 'INSUFFICIENT_DATA'
  status: 'DRAFT_REQUIRES_HUMAN_APPROVAL' | 'NOT_RECOMMENDED_YET'
  delivery: 'NOT_SENT'
  audiences: string[]
  title: string
  message: string
  requestedActions: string[]
  publicationRequirements: string[]
}

export type RecoveryOption = {
  hazardType: HazardType
  phase: 'VERIFY' | 'STABILISE' | 'REPAIR_OR_REGENERATE' | 'MONITOR'
  option: string
  precondition: string
  authorityGate: string
}

export type HazardInvestigationResult = {
  schemaVersion: '2.0'
  workflowVersion: 'terra-labmcp-hazard-investigation-v2'
  runId: string
  requestedAt: string
  completedAt: string
  classification: EvidenceState
  signalState: 'RECORDED_ANOMALY' | 'SCREENING_CANDIDATE' | 'INCONCLUSIVE_EVIDENCE' | 'NO_ANOMALY_ESTABLISHED' | 'IMAGERY_NOT_VISUALLY_INSPECTED'
  qaStatus: 'WARNING' | 'INSUFFICIENT_DATA'
  humanDecision: 'REQUIRED_BEFORE_PUBLICATION_OR_INTERVENTION'
  area: {
    requestedName: string
    resolvedName: string
    latitude: number
    longitude: number
    radiusKm: number
    resolutionMethod: 'SUPPLIED_COORDINATES' | 'OPENSTREETMAP_NOMINATIM_FIRST_MATCH'
    alternativeMatches: number
  }
  period: { startYear: number; endYear: number; season: InvestigationSeason; timelineMode: TimelineMode }
  hazards: HazardType[]
  sourceStatus: InvestigationSource[]
  agents: InvestigationAgent[]
  toolsExecuted: string[]
  imagery: {
    requestedYears: number[]
    slots: YearlyImageSlot[]
    visuallyInspectedByModel: number
    galleryImageSlotsNotClaimedAsInspected: number
    missingYears: number
    analysis: WorkerAreaAnalysis | null
    warning: string
  }
  observations: InvestigationObservation[]
  screeningSignals: Array<{
    hazardType: HazardType
    matchedText: string
    meaning: 'TEXT_SCREENING_CANDIDATE_NOT_CAUSAL_PROOF' | 'STRUCTURED_HYDROLOGY_SCREENING_NOT_CAUSAL_PROOF'
  }>
  hypotheses: CausalHypothesis[]
  alertDraft: PreliminaryAlertDraft
  recoveryOptions: RecoveryOption[]
  requiredFieldChecks: string[]
  verification: VerificationResult
  promotionGate: {
    verifiedFindingAllowed: false
    currentStage: EvidenceState
    requirements: string[]
  }
  analogues: AnalogueSearch | null
  test001Context: {
    evidence: Test001Evidence
    reference: ReferenceResolution
    connectivity: ConnectivityContextItem[]
  } | null
  provenance: ProvenanceRecord[]
  limitations: string[]
}

export const HAZARD_LABELS: Record<HazardType, string> = {
  'water-loss': 'wysychanie rzeki, jeziora lub stawu',
  'flow-obstruction': 'zator albo zmiana dopływu/odpływu',
  'terrain-change': 'zmiana ukształtowania terenu',
  flood: 'powódź lub podtopienie',
  'snow-avalanche': 'lawina śnieżna',
  landslide: 'osuwisko',
  wildfire: 'pożar i ślad wypalenia',
  'coastal-change': 'erozja lub zmiana wybrzeża',
}

const WATER_HAZARDS = new Set<HazardType>(['water-loss', 'flow-obstruction', 'flood'])

export function getVisibleWaterExtrema(result: HazardInvestigationResult): VisibleWaterExtrema | null {
  if (!result.hazards.some(hazard => WATER_HAZARDS.has(hazard))) return null
  const value = result.imagery.analysis?.analysis.hydrology_screening?.visible_water_extrema
  if (!value || !Array.isArray(value.compared_years) || typeof value.basis !== 'string') {
    return {
      status: 'INSUFFICIENT_EVIDENCE',
      most_visible_water_year: null,
      least_visible_water_year: null,
      compared_years: [],
      method: 'QUALITATIVE_VISUAL_RANKING_OF_SUPPLIED_IMAGES',
      basis: result.imagery.visuallyInspectedByModel > 0
        ? 'Ta wersja odpowiedzi nie zawiera zweryfikowanego rankingu lat. Uruchom badanie ponownie po aktualizacji Workera.'
        : 'Nie przeanalizowano porównywalnych obrazów, więc nie wolno wskazać roku maksimum ani minimum wody.',
    }
  }
  const analysisImages = result.imagery.analysis?.analysis_images ?? result.imagery.analysis?.preview_images ?? []
  const rankingEligibleYears = [...new Set(analysisImages
    .filter(image => image.high_resolution_aoi === true
      && image.image_authenticity !== 'DERIVED_ANALYTICAL_PRODUCT'
      && image.image_authenticity !== 'AI_GENERATED_IMAGE'
      && image.ai_generated !== true)
    .map(image => Number(image.date.slice(0, 4)))
    .filter(Number.isInteger))]
  const enforceTp26ImageYears = result.imagery.analysis?.tp26_protocol?.schema.startsWith('tp26-') === true
    || result.imagery.analysis?.water_extrema_readiness?.requires_high_resolution_aoi === true
  const periodStart = Number.isInteger(result.period?.startYear) ? result.period.startYear : Number.MIN_SAFE_INTEGER
  const periodEnd = Number.isInteger(result.period?.endYear) ? result.period.endYear : Number.MAX_SAFE_INTEGER
  const years = [...new Set(value.compared_years.filter(year => Number.isInteger(year)
    && year >= periodStart
    && year <= periodEnd))].slice(0, 8)
  const rankingYearsValid = !enforceTp26ImageYears || (years.length >= 2 && years.every(year => rankingEligibleYears.includes(year)))
  const basis = value.basis.trim()
  const methodValid = value.method === 'QUALITATIVE_VISUAL_RANKING_OF_SUPPLIED_IMAGES'
  const established = value.status === 'ESTABLISHED'
    && Number.isInteger(value.most_visible_water_year)
    && Number.isInteger(value.least_visible_water_year)
    && value.most_visible_water_year !== value.least_visible_water_year
    && years.includes(value.most_visible_water_year as number)
    && years.includes(value.least_visible_water_year as number)
    && rankingYearsValid
    && methodValid
    && basis.length > 0
  return established ? { ...value, basis, compared_years: years } : {
    status: 'INSUFFICIENT_EVIDENCE',
    most_visible_water_year: null,
    least_visible_water_year: null,
    compared_years: years,
    method: 'QUALITATIVE_VISUAL_RANKING_OF_SUPPLIED_IMAGES',
    basis: value.status === 'ESTABLISHED' && !rankingYearsValid
      ? 'Bramka TP26 w przeglądarce odrzuciła ranking: każdy porównany rok musi występować w wejściach AOI wysokiej rozdzielczości faktycznie przekazanych do analizy.'
      : basis || 'Brak wystarczających porównywalnych obrazów do rankingu lat.',
  }
}

const SEASON_DATES: Record<InvestigationSeason, [string, string]> = {
  all: ['01-01', '12-31'],
  spring: ['03-01', '05-31'],
  summer: ['06-01', '08-31'],
  autumn: ['09-01', '11-30'],
  winter: ['01-01', '02-28'],
}

const SIGNAL_TERMS: Record<HazardType, RegExp[]> = {
  'water-loss': [/\b(reduc(?:ed|tion)|shrink(?:ing|age)?|dry(?:ing|ied)?|water loss|exposed (?:bed|sediment)|open water (?:decline|absent))\b/i],
  'flow-obstruction': [/\b(block(?:ed|age)?|obstruct(?:ed|ion)?|constrict(?:ed|ion)?|disconnected channel|closed channel)\b/i],
  'terrain-change': [/\b(earthworks?|excavat(?:ion|ed)|new cut|terrain change|erosion|deposition|new embankment)\b/i],
  flood: [/\b(flood(?:ed|ing)?|inundat(?:ed|ion)|overflow|widespread standing water|submerged)\b/i],
  'snow-avalanche': [/\b(avalanche|release zone|crown fracture|snow debris|debris fan)\b/i],
  landslide: [/\b(landslide|slope failure|slump|mass movement|fresh scar)\b/i],
  wildfire: [/\b(wildfire|burn(?:ed|t) area|burn scar|smoke plume|fire front)\b/i],
  'coastal-change': [/\b(shoreline retreat|coastal erosion|beach loss|barrier breach|coastal change)\b/i],
}

const HYPOTHESIS_LIBRARY: Record<HazardType, Array<{ text: string; checks: string[] }>> = {
  'water-loss': [
    { text: 'Regionalny deficyt opadu i wzrost parowania obniżyły bilans wodny.', checks: ['Dane opad–PET z dopasowanych sezonów', 'Poziom wód gruntowych i wodowskazy', 'Porównanie z wodami kontrolnymi w tej samej zlewni'] },
    { text: 'Zmiana drożności dopływu lub odpływu zmieniła lokalny bilans wody.', checks: ['Pomiar przepływu powyżej i poniżej podejrzanego miejsca', 'Inspekcja przepustów, rowów i kanałów', 'Chronologia robót wodnych i map melioracyjnych'] },
    { text: 'Drenaż, pobór wody albo zmiana użytkowania terenu przyczyniły się do spadku poziomu.', checks: ['Pozwolenia wodnoprawne i ewidencja poboru', 'Piezometry i mapa hydrogeologiczna', 'Klasyfikacja użytkowania terenu w czasie'] },
    { text: 'Sedymentacja lub sukcesja roślinna ograniczyły widoczne lustro wody.', checks: ['Batymetria i rdzenie osadów', 'Zdjęcia terenowe i klasyfikacja roślinności', 'Porównanie radarowe Sentinel-1'] },
  ],
  'flow-obstruction': [
    { text: 'Przepust, kanał albo rów został zatkany, uszkodzony lub przekształcony.', checks: ['Inspekcja kamerą i niwelacja', 'Pomiar piętrzenia oraz przepływu po obu stronach', 'Dokumentacja zarządcy i historia robót'] },
    { text: 'Naturalne rumosze, roślinność albo działalność bobrów zmieniły drożność.', checks: ['Oględziny terenowe z GPS', 'Zdjęcia przed/po i ślady przepływu', 'Konsultacja z zarządcą wód i ochroną przyrody'] },
    { text: 'Widoczna geometria nie oznacza zatoru; jest cieniem, sezonowością albo nieczynnym ramieniem.', checks: ['Obraz radarowy i optyczny z tego samego okresu', 'Model wysokościowy i kierunek spadku', 'Kontrola terenowa'] },
  ],
  'terrain-change': [
    { text: 'Erozja, akumulacja osadów albo naturalna migracja koryta zmieniły rzeźbę.', checks: ['Różnicowy LiDAR/DEM', 'Przekroje geodezyjne', 'Chronologia wezbrań i transportu osadu'] },
    { text: 'Roboty ziemne, zabudowa lub zmiana użytkowania terenu przekształciły odpływ.', checks: ['Ortofotomapy i pozwolenia budowlane', 'Mapa rowów/przepustów przed i po', 'Kontrola terenowa z właścicielem lub zarządcą'] },
    { text: 'Pozorna zmiana wynika z kąta oświetlenia, śniegu, roślinności albo różnej rozdzielczości.', checks: ['Dopasowane sezony i geometria obserwacji', 'Niezależny sensor radarowy', 'Produkty źródłowe o wyższej rozdzielczości'] },
  ],
  flood: [
    { text: 'Ekstremalny opad, roztopy albo nasycenie gleby wywołały nadmiar odpływu.', checks: ['Radar opadowy, stacje i GPM', 'Wilgotność gleby i pokrywa śnieżna', 'Hydrogramy dopływów'] },
    { text: 'Ograniczona przepustowość odpływu lub zator zwiększyły piętrzenie.', checks: ['Przekroje hydrauliczne i przepusty', 'Ślady wysokiej wody', 'Model hydrauliczny z obserwowanym przepływem'] },
    { text: 'Wylew rzeki, cofka lub awaria infrastruktury spowodowały zalanie.', checks: ['Wodowskazy i komunikaty zarządcy', 'Stan wałów/zapór/pompowni', 'Mapowanie zasięgu Sentinel-1'] },
  ],
  'snow-avalanche': [
    { text: 'Warstwy słabe, świeży śnieg, wiatr lub ocieplenie zwiększyły niestabilność pokrywy.', checks: ['Profil śniegowy przez uprawnione służby', 'Opad, wiatr i temperatura', 'Biuletyn lawinowy i ekspozycja stoku'] },
    { text: 'Ukształtowanie stoku i brak kotwienia roślinnością sprzyjały zejściu.', checks: ['Nachylenie i ekspozycja z DEM/LiDAR', 'Pokrycie roślinne', 'Kartowanie stref startu i depozycji'] },
    { text: 'Ślad na obrazie jest chmurą, cieniem, osuwiskiem lub sezonową zmianą śniegu.', checks: ['Radar Sentinel-1', 'Zdjęcia przed/po o tej samej geometrii', 'Weryfikacja służb terenowych'] },
  ],
  landslide: [
    { text: 'Nasycenie wodą, erozja podstawy stoku albo roztopy uruchomiły masę gruntu.', checks: ['Pomiary opadu i wód gruntowych', 'Inklinometry i szczelinomierze', 'Ekspertyza geotechniczna'] },
    { text: 'Wykop, obciążenie lub zmiana odwodnienia osłabiły stateczność stoku.', checks: ['Chronologia robót i odwodnienia', 'Dokumentacja geotechniczna', 'Interferometria SAR i pomiary terenowe'] },
    { text: 'Pozorny ślad jest zmianą roślinności, cieniem albo erozją powierzchniową.', checks: ['Dopasowane sceny optyczne', 'InSAR/LiDAR', 'Oględziny geologa'] },
  ],
  wildfire: [
    { text: 'Susza i dostępne paliwo umożliwiły rozwój pożaru; źródło zapłonu pozostaje nieznane.', checks: ['Wilgotność paliwa i wskaźniki suszy', 'Termalne detekcje FIRMS', 'Raport właściwej straży lub służby leśnej'] },
    { text: 'Widoczny ślad jest wypaleniem, lecz przyczyny naturalnej lub ludzkiej nie da się rozstrzygnąć satelitarnie.', checks: ['Oględziny pogorzeliska', 'Dane wyładowań i raport incydentu', 'Granice wypalenia Sentinel-2/Landsat'] },
    { text: 'Ciemna powierzchnia jest cieniem, wodą lub zmianą uprawy, a nie wypaleniem.', checks: ['Indeksy NBR/NDVI z produktów źródłowych', 'Termika i obraz przed/po', 'Kontrola terenowa'] },
  ],
  'coastal-change': [
    { text: 'Sztorm, fale i prądy przybrzeżne przemieściły osad oraz linię brzegu.', checks: ['Poziom morza, fale i chronologia sztormów', 'Dopasowane pływy na obrazach', 'Profile plaży i bilans osadu'] },
    { text: 'Budowle hydrotechniczne lub ograniczenie dopływu osadu zmieniły transport brzegowy.', checks: ['Historia budowli i pogłębiania', 'Model transportu osadu', 'Porównanie odcinków kontrolnych'] },
    { text: 'Zmiana jest efektem pływu, sezonu albo błędu georejestracji.', checks: ['Korekta pływowa', 'Produkty ortorektyfikowane', 'Niezależne pomiary GNSS'] },
  ],
}

const RECOVERY_LIBRARY: Record<HazardType, RecoveryOption[]> = {
  'water-loss': [
    { hazardType: 'water-loss', phase: 'VERIFY', option: 'Założyć monitoring poziomu, przepływu i wód gruntowych oraz porównać bilans opad–parowanie.', precondition: 'Uzgodniony plan pomiarowy i punkty referencyjne.', authorityGate: 'Zgoda właściciela/zarządcy oraz właściwego organu wodnego.' },
    { hazardType: 'water-loss', phase: 'REPAIR_OR_REGENERATE', option: 'Warunkowo odtworzyć drożność, retencję lub mokradło na podstawie projektu hydrologicznego.', precondition: 'Potwierdzona przyczyna i model skutków dla obszarów powyżej i poniżej.', authorityGate: 'Projektant z uprawnieniami, pozwolenia wodnoprawne i ocena przyrodnicza.' },
    { hazardType: 'water-loss', phase: 'MONITOR', option: 'Utrzymać stałe punkty zdjęciowe, wodowskazy i coroczne sceny z dopasowanego sezonu.', precondition: 'Bazowy stan odniesienia zapisany z metadanymi.', authorityGate: 'Opiekun danych i właściciel terenu.' },
  ],
  'flow-obstruction': [
    { hazardType: 'flow-obstruction', phase: 'VERIFY', option: 'Zmapować dopływy, odpływy, przepusty, studnie i rowy oraz zmierzyć piętrzenie po obu stronach.', precondition: 'Bezpieczny dostęp i aktualna mapa własności/zarządu.', authorityGate: 'Zarządca wód, drogi lub urządzenia.' },
    { hazardType: 'flow-obstruction', phase: 'REPAIR_OR_REGENERATE', option: 'Usunąć lub przebudować potwierdzoną przeszkodę i odtworzyć ciągłość przepływu.', precondition: 'Obliczenia hydrauliczne wykluczają zwiększenie ryzyka powodziowego i szkód siedliskowych.', authorityGate: 'Wyłącznie właściwy zarządca po uzyskaniu wymaganych zgód; aplikacja nie zleca robót.' },
  ],
  'terrain-change': [
    { hazardType: 'terrain-change', phase: 'VERIFY', option: 'Wykonać różnicowy LiDAR/DEM i przekroje geodezyjne w punktach podejrzanej zmiany.', precondition: 'Dane z porównywalnych epok i układu odniesienia.', authorityGate: 'Uprawniony geodeta/geolog oraz zgoda na wejście w teren.' },
    { hazardType: 'terrain-change', phase: 'REPAIR_OR_REGENERATE', option: 'Przywrócić bezpieczną geometrię odpływu, zabezpieczyć erozję lub zrekultywować teren.', precondition: 'Potwierdzony mechanizm i projekt techniczny.', authorityGate: 'Właściwy organ budowlany/wodny i właściciel.' },
  ],
  flood: [
    { hazardType: 'flood', phase: 'STABILISE', option: 'Uruchomić lokalne ostrzeganie, przegląd dróg ewakuacji i ochronę obiektów krytycznych.', precondition: 'Aktualne prognozy i potwierdzenie właściwych służb.', authorityGate: 'Decyzje służb kryzysowych; aplikacja tylko przygotowuje szkic alertu.' },
    { hazardType: 'flood', phase: 'REPAIR_OR_REGENERATE', option: 'Zwiększyć retencję, odtworzyć teren zalewowy lub poprawić przepustowość po modelowaniu hydraulicznym.', precondition: 'Model obejmuje skutki w górę i w dół zlewni.', authorityGate: 'Zarządca wód, samorząd i wymagane pozwolenia środowiskowe.' },
  ],
  'snow-avalanche': [
    { hazardType: 'snow-avalanche', phase: 'STABILISE', option: 'Czasowo ograniczyć dostęp do zagrożonej strefy według decyzji służb i bieżącego biuletynu.', precondition: 'Ocena przez uprawnioną służbę lawinową.', authorityGate: 'Właściwe służby ratownicze i zarządca terenu.' },
    { hazardType: 'snow-avalanche', phase: 'REPAIR_OR_REGENERATE', option: 'Rozważyć bariery, płotki śnieżne, zalesienie ochronne lub kontrolowane wyzwalanie.', precondition: 'Model stref startu/toru/depozycji i projekt specjalistyczny.', authorityGate: 'Tylko wyspecjalizowane, uprawnione podmioty.' },
  ],
  landslide: [
    { hazardType: 'landslide', phase: 'STABILISE', option: 'Ograniczyć obciążenie i dostęp oraz rozpocząć pomiary przemieszczeń.', precondition: 'Ocena bezpieczeństwa przez geotechnika.', authorityGate: 'Zarządca terenu i służby lokalne.' },
    { hazardType: 'landslide', phase: 'REPAIR_OR_REGENERATE', option: 'Zaprojektować odwodnienie, podparcie lub zmianę geometrii stoku.', precondition: 'Rozpoznanie geotechniczne i hydrologiczne.', authorityGate: 'Projektant z uprawnieniami i pozwolenie budowlane/środowiskowe.' },
  ],
  wildfire: [
    { hazardType: 'wildfire', phase: 'STABILISE', option: 'Przekazać potwierdzoną detekcję właściwej straży i stosować oficjalne ograniczenia dostępu.', precondition: 'Aktualne dane termalne lub potwierdzenie terenowe.', authorityGate: 'Straż pożarna/leśna; aplikacja nie kieruje akcją.' },
    { hazardType: 'wildfire', phase: 'REPAIR_OR_REGENERATE', option: 'Zaplanować ochronę gleby, kontrolę erozji i odnowę siedliska po ocenie stopnia wypalenia.', precondition: 'Mapa intensywności wypalenia i ekspertyza przyrodnicza.', authorityGate: 'Zarządca lasu/terenu oraz organ ochrony przyrody.' },
  ],
  'coastal-change': [
    { hazardType: 'coastal-change', phase: 'VERIFY', option: 'Prowadzić profile brzegu, linię brzegową po korekcie pływu i monitoring fal/sztormów.', precondition: 'Stałe repery i jednolita metodyka.', authorityGate: 'Zarządca wybrzeża i służba hydrograficzna.' },
    { hazardType: 'coastal-change', phase: 'REPAIR_OR_REGENERATE', option: 'Rozważyć odbudowę wydm/mokradeł lub ochronę techniczną po analizie transportu osadu.', precondition: 'Ocena wariantów i wpływu na sąsiednie odcinki.', authorityGate: 'Właściwy urząd morski i decyzje środowiskowe.' },
  ],
}

function assertInput(input: HazardInvestigationInput) {
  const currentYear = new Date().getUTCFullYear()
  if (!input.regionQuery.trim()) throw new Error('Wpisz nazwę regionu albo wybierz preset.')
  if (input.latitude !== undefined && (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90)) throw new Error('Szerokość geograficzna jest poza zakresem WGS84.')
  if (input.longitude !== undefined && (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180)) throw new Error('Długość geograficzna jest poza zakresem WGS84.')
  if ((input.latitude === undefined) !== (input.longitude === undefined)) throw new Error('Podaj obie współrzędne albo pozostaw obie puste.')
  if (!Number.isFinite(input.radiusKm) || input.radiusKm < 1 || input.radiusKm > 500) throw new Error('Promień musi mieścić się w zakresie 1–500 km.')
  if ((input.focusLatitude === undefined) !== (input.focusLongitude === undefined)) throw new Error('Podaj obie współrzędne zbliżenia albo pozostaw obie puste.')
  if (input.focusLatitude !== undefined && (!Number.isFinite(input.focusLatitude) || input.focusLatitude < -90 || input.focusLatitude > 90)) throw new Error('Szerokość zbliżenia jest poza zakresem WGS84.')
  if (input.focusLongitude !== undefined && (!Number.isFinite(input.focusLongitude) || input.focusLongitude < -180 || input.focusLongitude > 180)) throw new Error('Długość zbliżenia jest poza zakresem WGS84.')
  if (input.focusRadiusKm !== undefined && (!Number.isFinite(input.focusRadiusKm) || input.focusRadiusKm < 0.1 || input.focusRadiusKm > 50)) throw new Error('Promień zbliżenia musi mieścić się w zakresie 0,1–50 km.')
  if (!Number.isInteger(input.startYear) || input.startYear < 1972 || input.startYear > currentYear) throw new Error(`Rok początkowy musi mieścić się w zakresie 1972–${currentYear}.`)
  if (!Number.isInteger(input.endYear) || input.endYear < input.startYear || input.endYear > currentYear) throw new Error(`Rok końcowy musi mieścić się między rokiem początkowym a ${currentYear}.`)
  if (!input.hazardTypes.length) throw new Error('Wybierz co najmniej jeden typ zagrożenia.')
  if (input.hazardTypes.some(item => !HAZARD_TYPES.includes(item))) throw new Error('Nieznany typ zagrożenia.')
}

function seasonRange(startYear: number, endYear: number, season: InvestigationSeason) {
  const [start, end] = SEASON_DATES[season]
  return { startDate: `${startYear}-${start}`, endDate: `${endYear}-${end}` }
}

function approximatelyEqual(left: number, right: number, tolerance: number) {
  return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= tolerance
}

function isExactTest001Request(input: HazardInvestigationInput, latitude: number, longitude: number) {
  const expectedAoiRadiusKm = TEST_001_AOI.widthM / 1_000
  const expectedFocusRadiusKm = TEST_001_AOI.pondFocus.requestedFrameWidthM / 2_000
  return input.caseId === TEST_001_CASE_ID
    && approximatelyEqual(latitude, TEST_001_AOI.center.lat, COORDINATE_TOLERANCE_DEGREES)
    && approximatelyEqual(longitude, TEST_001_AOI.center.lon, COORDINATE_TOLERANCE_DEGREES)
    && approximatelyEqual(input.radiusKm, expectedAoiRadiusKm, RADIUS_TOLERANCE_KM)
    && input.focusLatitude !== undefined
    && approximatelyEqual(input.focusLatitude, TEST_001_AOI.pondFocus.lat, COORDINATE_TOLERANCE_DEGREES)
    && input.focusLongitude !== undefined
    && approximatelyEqual(input.focusLongitude, TEST_001_AOI.pondFocus.lon, COORDINATE_TOLERANCE_DEGREES)
    && input.focusRadiusKm !== undefined
    && approximatelyEqual(input.focusRadiusKm, expectedFocusRadiusKm, RADIUS_TOLERANCE_KM)
}

function selectYears(startYear: number, endYear: number, mode: TimelineMode) {
  const all = Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index)
  if (mode === 'annual' || all.length <= 12) return all
  const selected = new Set<number>([startYear, endYear])
  for (let index = 0; index < 12; index += 1) selected.add(Math.round(startYear + (index * (endYear - startYear)) / 11))
  return [...selected].sort((left, right) => left - right)
}

function chunks<T>(values: T[], size: number) {
  const result: T[][] = []
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size))
  return result
}

async function readJson<T>(response: Response) {
  const payload = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) throw new Error(payload.error ?? `HTTP ${response.status}`)
  return payload
}

class WorkerAnalysisMismatchError extends Error {}

function analysisMismatch(reason: string): never {
  throw new WorkerAnalysisMismatchError(`Odrzucono odpowiedź Terra Worker: ${reason}`)
}

function isoCalendarDate(value: unknown) {
  if (typeof value !== 'string') return null
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value)
  if (!match) return null
  const parsed = new Date(`${match[1]}T00:00:00Z`)
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== match[1] ? null : match[1]
}

function validateAnalysisResponse(
  analysis: WorkerAreaAnalysis,
  input: HazardInvestigationInput,
  latitude: number,
  longitude: number,
) {
  const requestedPeriod = seasonRange(input.startYear, input.endYear, input.season)
  const todayUtc = new Date().toISOString().slice(0, 10)
  const expectedPeriod = {
    startDate: requestedPeriod.startDate,
    endDate: requestedPeriod.endDate > todayUtc ? todayUtc : requestedPeriod.endDate,
  }
  const area = analysis?.area
  if (!area
    || !approximatelyEqual(area.latitude, latitude, COORDINATE_TOLERANCE_DEGREES)
    || !approximatelyEqual(area.longitude, longitude, COORDINATE_TOLERANCE_DEGREES)
    || !approximatelyEqual(area.radius_km, input.radiusKm, RADIUS_TOLERANCE_KM)) {
    analysisMismatch('AOI (współrzędne lub promień) nie odpowiada żądaniu.')
  }
  if (input.focusLatitude !== undefined && input.focusLongitude !== undefined) {
    const focus = analysis.visual_focus
    if (!focus
      || !approximatelyEqual(focus.latitude, input.focusLatitude, COORDINATE_TOLERANCE_DEGREES)
      || !approximatelyEqual(focus.longitude, input.focusLongitude, COORDINATE_TOLERANCE_DEGREES)
      || (input.focusRadiusKm !== undefined && !approximatelyEqual(focus.radius_km, input.focusRadiusKm, RADIUS_TOLERANCE_KM))) {
      analysisMismatch('współrzędne lub promień zbliżenia nie odpowiadają żądaniu.')
    }
  }
  if (analysis.period?.start_date !== expectedPeriod.startDate || analysis.period?.end_date !== expectedPeriod.endDate) {
    analysisMismatch('okres odpowiedzi nie odpowiada żądanemu okresowi i sezonowi.')
  }
  if (analysis.analysis_images !== undefined && !Array.isArray(analysis.analysis_images)) {
    analysisMismatch('lista wejść obrazu modelu ma nieprawidłowy format.')
  }
  for (const image of analysis.analysis_images ?? []) {
    const imageDate = isoCalendarDate(image?.date)
    if (!imageDate || imageDate < expectedPeriod.startDate || imageDate > expectedPeriod.endDate) {
      analysisMismatch(`wejście obrazu modelu ma datę spoza żądanego okresu: ${String(image?.date ?? 'brak daty')}.`)
    }
  }
  return analysis
}

export async function analyzeMultiyearImagery(input: HazardInvestigationInput, latitude: number, longitude: number) {
  const range = seasonRange(input.startYear, input.endYear, input.season)
  const response = await fetch(`${TERRA_EVIDENCE_API_URL}/research/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      latitude,
      longitude,
      radius_km: input.radiusKm,
      ...(input.caseId ? { case_id: input.caseId } : {}),
      ...(input.focusLatitude === undefined ? {} : { focus_latitude: input.focusLatitude }),
      ...(input.focusLongitude === undefined ? {} : { focus_longitude: input.focusLongitude }),
      ...(input.focusRadiusKm === undefined ? {} : { focus_radius_km: input.focusRadiusKm }),
      start_date: range.startDate,
      end_date: range.endDate,
      place_name: input.regionQuery,
      depth: input.depth === 'deep' ? 'deep' : 'quick',
      season: input.season,
      spatial_mode: input.spatialMode ?? 'overview',
      ...(input.spatialMode === 'regional-patrol' ? {
        patrol_tile_count: input.patrolTileCount ?? 20,
        patrol_frame_width_km: input.patrolFrameWidthKm ?? 1,
      } : {}),
    }),
  })
  const analysis = await readJson<WorkerAreaAnalysis>(response)
  return validateAnalysisResponse(analysis, input, latitude, longitude)
}

export async function retrieveMultiyearImagery(input: HazardInvestigationInput, latitude: number, longitude: number) {
  const years = selectYears(input.startYear, input.endYear, input.timelineMode)
  const batches = chunks(years, 6)
  const settled = await Promise.allSettled(batches.map(async batch => {
    const response = await fetch(`${TERRA_EVIDENCE_API_URL}/research/yearly-gallery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude,
        longitude,
        radius_km: input.radiusKm,
        years: batch,
        season: input.season,
        cloud_mode: 'clear',
      }),
    })
    return readJson<YearlyGalleryResponse>(response)
  }))
  const returned = settled.flatMap(item => item.status === 'fulfilled' ? item.value.slots : [])
  const returnedYears = new Set(returned.map(item => item.year))
  const failedSlots = years.filter(year => !returnedYears.has(year)).map<YearlyImageSlot>(year => ({
    year,
    status: 'missing',
    reason: 'Partia katalogu rocznego nie odpowiedziała; brak obrazu nie oznacza braku zjawiska.',
  }))
  return {
    requestedYears: years,
    slots: [...returned, ...failedSlots].sort((left, right) => left.year - right.year),
    failedBatches: settled.filter(item => item.status === 'rejected').length,
  }
}

function sourceProvenance(dataset: string, area: string, operation: string, sourceUrl: string, parameters: Record<string, unknown>, uncertainty: string): ProvenanceRecord {
  const now = new Date().toISOString()
  return {
    provider: 'Terra Observation System public evidence Worker',
    dataset,
    aoi: area,
    dateTime: now,
    operation,
    tool: operation,
    timestamp: now,
    uncertainty,
    requestParameters: { ...parameters, sourceUrl },
  }
}

export function verifiedOriginalModelImageCount(analysis: WorkerAreaAnalysis | null) {
  if (!analysis) return 0
  const policy = analysis.imagery_authenticity_policy
  const images = analysis.analysis_images ?? []
  const originals = images.filter(image => (
    image.image_authenticity === 'ORIGINAL_OFFICIAL_SATELLITE_PRODUCT'
    && image.ai_generated === false
    && image.used_as_model_input === true
  ))
  const policyValid = policy?.model_input_rule === 'ORIGINAL_OFFICIAL_SATELLITE_PRODUCTS_ONLY'
    && policy.derived_model_input_count === 0
    && policy.ai_generated_model_input_count === 0
    && policy.original_model_input_count === originals.length
    && policy.original_model_input_count === (analysis.model_visual_image_count ?? analysis.ai_visual_image_count)
    && images.length === originals.length
  return policyValid ? originals.length : 0
}

export function screenSignals(analysis: WorkerAreaAnalysis | null, hazards: HazardType[]) {
  if (!analysis || verifiedOriginalModelImageCount(analysis) < 1) return []
  const hydrology = analysis.analysis.hydrology_screening
  const signals: HazardInvestigationResult['screeningSignals'] = []
  if (hazards.includes('water-loss') && hydrology?.water_change_state === 'VISIBLE_WATER_REDUCTION_CANDIDATE') {
    signals.push({
      hazardType: 'water-loss',
      matchedText: `${hydrology.water_change_state}: ${hydrology.temporal_basis}`,
      meaning: 'STRUCTURED_HYDROLOGY_SCREENING_NOT_CAUSAL_PROOF',
    })
  }
  if (hazards.includes('flow-obstruction') && hydrology?.inflow_outflow_status === 'VISIBLE_CANDIDATES') {
    const obstructionCandidate = hydrology.candidate_features.find(feature => SIGNAL_TERMS['flow-obstruction'].some(pattern => pattern.test(feature)))
    if (obstructionCandidate) {
      signals.push({
        hazardType: 'flow-obstruction',
        matchedText: obstructionCandidate,
        meaning: 'STRUCTURED_HYDROLOGY_SCREENING_NOT_CAUSAL_PROOF',
      })
    }
  }
  const sentences = [
    analysis.analysis.change_over_time,
    analysis.analysis.water_assessment,
    ...analysis.analysis.notable_features,
  ].flatMap(value => value.split(/(?<=[.!?])\s+/)).map(value => value.trim()).filter(Boolean)
  for (const hazardType of hazards) {
    if (signals.some(signal => signal.hazardType === hazardType)) continue
    if (hydrology && (hazardType === 'water-loss' || hazardType === 'flow-obstruction')) continue
    for (const sentence of sentences) {
      if (/\b(no evidence|not visible|cannot determine|insufficient evidence|unclear whether)\b/i.test(sentence)) continue
      if (SIGNAL_TERMS[hazardType].some(pattern => pattern.test(sentence))) {
        signals.push({ hazardType, matchedText: sentence, meaning: 'TEXT_SCREENING_CANDIDATE_NOT_CAUSAL_PROOF' })
        break
      }
    }
  }
  return signals
}

export function rankCausalHypotheses(hazards: HazardType[], signals: HazardInvestigationResult['screeningSignals'], recordedAnomaly = false) {
  let id = 0
  return hazards.flatMap(hazardType => HYPOTHESIS_LIBRARY[hazardType].map((item, index): CausalHypothesis => {
    id += 1
    const visibleSignal = signals.find(signal => signal.hazardType === hazardType)
    return {
      id: `H${id}`,
      hazardType,
      hypothesis: item.text,
      status: visibleSignal || recordedAnomaly ? 'VISIBLE_PATTERN_REQUIRES_TEST' : 'UNTESTED',
      priority: index + 1,
      supportingEvidence: visibleSignal ? [visibleSignal.matchedText] : recordedAnomaly ? ['Zarejestrowana anomalia TEST 001 uzasadnia zbadanie mechanizmu, ale go nie potwierdza.'] : [],
      contradictingEvidence: [],
      requiredChecks: item.checks,
    }
  }))
}

function alertAudiences(hazards: HazardType[]) {
  const audiences = new Set(['właściciel lub zarządca terenu', 'właściwy organ ochrony środowiska'])
  if (hazards.some(item => ['flood', 'snow-avalanche', 'landslide', 'wildfire'].includes(item))) audiences.add('lokalne służby zarządzania kryzysowego')
  if (hazards.some(item => WATER_HAZARDS.has(item))) audiences.add('właściwy zarządca wód lub urządzeń melioracyjnych')
  if (hazards.includes('snow-avalanche')) audiences.add('uprawniona służba lawinowa i ratownicza')
  if (hazards.includes('wildfire')) audiences.add('straż pożarna lub służba leśna')
  if (hazards.includes('coastal-change')) audiences.add('właściwy urząd morski')
  return [...audiences]
}

export function draftPreliminaryAlert(input: {
  region: string
  hazards: HazardType[]
  hasRecordedAnomaly: boolean
  signals: HazardInvestigationResult['screeningSignals']
  visualImageCount: number
}): PreliminaryAlertDraft {
  const eligible = input.hasRecordedAnomaly || (input.signals.length > 0 && input.visualImageCount >= 2)
  if (!eligible) {
    return {
      evidenceClass: 'INSUFFICIENT_DATA',
      status: 'NOT_RECOMMENDED_YET',
      delivery: 'NOT_SENT',
      audiences: alertAudiences(input.hazards),
      title: `Brak podstaw do alertu dla: ${input.region}`,
      message: 'Zebrano materiał katalogowy lub obserwacyjny, ale nie ustanowiono anomalii spełniającej bramkę wstępnego alertu. Należy kontynuować analizę i weryfikację terenową.',
      requestedActions: ['Sprawdzić brakujące obrazy i dane terenowe.', 'Nie publikować twierdzenia o przyczynie ani poziomie ryzyka.'],
      publicationRequirements: ['Niezależna ocena eksperta', 'Potwierdzenie właściwego organu przed komunikatem publicznym'],
    }
  }
  return {
    evidenceClass: 'PRELIMINARY_RISK_ALERT',
    status: 'DRAFT_REQUIRES_HUMAN_APPROVAL',
    delivery: 'NOT_SENT',
    audiences: alertAudiences(input.hazards),
    title: `Wstępny alert monitoringowy — ${input.region}`,
    message: `W materiale wieloletnim wykryto sygnał wymagający pilnego sprawdzenia pod kątem: ${input.hazards.map(item => HAZARD_LABELS[item]).join(', ')}. Jest to hipoteza/alert wstępny, nie potwierdzona przyczyna ani prognoza. Potrzebna jest kontrola terenowa i ocena właściwych służb.`,
    requestedActions: ['Zabezpieczyć materiał źródłowy i metadane.', 'Wykonać wskazane pomiary terenowe.', 'Ocenić, czy istnieje bezpośrednie zagrożenie dla ludzi, infrastruktury lub siedlisk.', 'Po weryfikacji zdecydować o komunikacie i działaniach technicznych.'],
    publicationRequirements: ['Akceptacja człowieka', 'Sprawdzenie dat, AOI i źródeł', 'Wyraźne podanie niepewności', 'Kontakt z właściwym organem, bez automatycznej wysyłki z aplikacji'],
  }
}

export function proposeRecoveryOptions(hazards: HazardType[]) {
  return hazards.flatMap(hazard => RECOVERY_LIBRARY[hazard])
}

export function evaluateGroundVerification(input: {
  verificationDate: string
  method: string
  finding: string
  sourceUrl: string
  independentlyVerified: boolean
  measurementsAttached: boolean
  responsibleExpert: string
  humanApproved: true
}) {
  const complete = Boolean(
    /^\d{4}-\d{2}-\d{2}$/.test(input.verificationDate)
    && input.method.trim().length >= 10
    && input.finding.trim().length >= 10
    && /^https:\/\//.test(input.sourceUrl)
    && input.independentlyVerified
    && input.measurementsAttached
    && input.responsibleExpert.trim().length >= 3
    && input.humanApproved,
  )
  return complete ? {
    classification: 'VERIFIED_FINDING' as const,
    status: 'ELIGIBLE_FOR_RECORDED_FINDING',
    finding: input.finding,
    limitation: 'Weryfikacja dotyczy wyłącznie wskazanego stwierdzenia, miejsca, daty i metody; nie rozszerza automatycznie wniosku na inne przyczyny lub regiony.',
  } : {
    classification: 'HYPOTHESIS' as const,
    status: 'VERIFICATION_INCOMPLETE',
    finding: input.finding,
    limitation: 'Nie spełniono pełnej bramki: niezależny ekspert, pomiary, źródło, metoda i akceptacja człowieka są obowiązkowe.',
  }
}

function fieldChecks(hazards: HazardType[], hydrology?: HydrologyScreening, includeTest001Network = false) {
  const waterNetworkChecks = hazards.some(hazard => WATER_HAZARDS.has(hazard)) ? [
    'Zweryfikować w oficjalnej hydrografii przebieg cieku głównego, dopływów bocznych, dopływów i odpływów zbiornika.',
    'Zbudować skierowaną sieć cieków, rowów, przepustów i urządzeń wodnych; kierunku przepływu nie wyznaczać wyłącznie z koloru obrazu.',
    'Porównać przepływ lub stan wody powyżej i poniżej podejrzanych miejsc razem z opadem, PET i wodą gruntową.',
  ] : []
  const test001Checks = includeTest001Network ? [
    'Dla TEST 001 sprawdzić oficjalną geometrię i aktualną drożność kandydata: Jezioro Kuchnia → Gardęga → Osa.',
  ] : []
  return [...new Set([
    ...waterNetworkChecks,
    ...test001Checks,
    ...(hydrology?.required_checks ?? []),
    ...hazards.flatMap(hazard => HYPOTHESIS_LIBRARY[hazard].flatMap(item => item.checks)),
  ])].slice(0, 24)
}

function source(id: string, name: string, provider: string, state: SourceState, role: string, detail: string, sourceUrl: string): InvestigationSource {
  return { id, name, provider, state, role, detail, sourceUrl }
}

export async function runHazardInvestigation(input: HazardInvestigationInput): Promise<HazardInvestigationResult> {
  assertInput(input)
  const requestedAt = new Date().toISOString()
  let latitude = input.latitude
  let longitude = input.longitude
  let resolvedName = input.regionQuery.trim()
  let resolutionMethod: HazardInvestigationResult['area']['resolutionMethod'] = 'SUPPLIED_COORDINATES'
  let alternativeMatches = 0
  const sourceStatus: InvestigationSource[] = []
  const provenance: ProvenanceRecord[] = []
  const toolsExecuted: string[] = []

  if (latitude === undefined || longitude === undefined) {
    toolsExecuted.push('search_location')
    const matches = await searchLocation(input.regionQuery)
    const selected = matches[0]
    if (!selected) throw new Error('OpenStreetMap Nominatim nie zwrócił pasującego regionu. Podaj współrzędne WGS84.')
    latitude = selected.lat
    longitude = selected.lon
    resolvedName = selected.displayName
    resolutionMethod = 'OPENSTREETMAP_NOMINATIM_FIRST_MATCH'
    alternativeMatches = Math.max(0, matches.length - 1)
    sourceStatus.push(source('nominatim', 'Rozpoznanie regionu', 'OpenStreetMap Nominatim', matches.length > 1 ? 'WARNING' : 'PASS', 'Geokodowanie', `Wybrano pierwszy z ${matches.length} wyników; współrzędne są jawne w raporcie.`, 'https://nominatim.openstreetmap.org/'))
    const now = new Date().toISOString()
    provenance.push({ provider: 'OpenStreetMap', dataset: 'Nominatim', aoi: resolvedName, dateTime: now, operation: 'search_location', tool: 'search_location', timestamp: now, uncertainty: matches.length > 1 ? 'Wybrano pierwszy wynik; użytkownik powinien potwierdzić AOI.' : 'Geokodowanie nazwy, nie pomiar terenowy.', requestParameters: { query: input.regionQuery, selected: { latitude, longitude }, alternativeMatches } })
  }

  const areaLabel = `${resolvedName}; ${latitude.toFixed(6)},${longitude.toFixed(6)}; radius ${input.radiusKm} km`
  const isTest001 = isExactTest001Request(input, latitude, longitude)
  if (input.caseId === TEST_001_CASE_ID && !isTest001) {
    throw new Error('TEST 001 wymaga jawnego identyfikatora oraz dokładnego AOI 53.594595, 19.000140 / 2 km i zbliżenia 53.594595, 19.000140 / 0,25 km.')
  }
  const needsWaterAnalogues = input.hazardTypes.some(item => WATER_HAZARDS.has(item))
  const analysisInput: HazardInvestigationInput = isTest001 ? {
    ...input,
    caseId: 'test-001-forest-pond-kuchnia',
    focusLatitude: 53.594595,
    focusLongitude: 19.00014,
    focusRadiusKm: 0.25,
  } : input
  const analysisPromise = analyzeMultiyearImagery(analysisInput, latitude, longitude)
  const galleryPromise = retrieveMultiyearImagery(input, latitude, longitude)
  const elevationPromise = getElevationProfile(latitude, longitude)
  const eventsPromise = findObservations(latitude, longitude, 60)
  const analoguePromise = needsWaterAnalogues ? findGlobalWaterAnalogues(12) : Promise.resolve(null)
  const test001Promise = isTest001 ? Promise.all([
    inspectTest001Evidence(),
    resolveReferenceDataset(input.referenceQuery ?? 'Toruń'),
  ]) : Promise.resolve(null)
  toolsExecuted.push('analyze_multiyear_imagery', 'retrieve_multiyear_imagery', 'get_elevation_profile', 'find_observations')
  if (needsWaterAnalogues) toolsExecuted.push('find_global_water_analogues')
  if (isTest001) toolsExecuted.push('inspect_test_001_evidence', 'resolve_reference_dataset', 'inspect_local_hydrology_context')

  const [analysisSettled, gallerySettled, elevationSettled, eventsSettled, analogueSettled, test001Settled] = await Promise.allSettled([
    analysisPromise,
    galleryPromise,
    elevationPromise,
    eventsPromise,
    analoguePromise,
    test001Promise,
  ])

  const analysis = analysisSettled.status === 'fulfilled' ? analysisSettled.value : null
  const analysisRejectedAsMismatch = analysisSettled.status === 'rejected' && analysisSettled.reason instanceof WorkerAnalysisMismatchError
  const visuallyInspectedByModel = verifiedOriginalModelImageCount(analysis)
  const requestedYears = selectYears(input.startYear, input.endYear, input.timelineMode)
  const gallery = gallerySettled.status === 'fulfilled' ? gallerySettled.value : {
    requestedYears,
    slots: requestedYears.map<YearlyImageSlot>(year => ({ year, status: 'missing', reason: 'Galeria roczna nie odpowiedziała.' })),
    failedBatches: Math.ceil(requestedYears.length / 6),
  }
  const elevation = elevationSettled.status === 'fulfilled' ? elevationSettled.value : { state: 'NOT_CONNECTED' as const, samples: [], provenance: [], error: String(elevationSettled.reason) }
  const events = eventsSettled.status === 'fulfilled' ? eventsSettled.value : { observations: [], provenance: [], source: 'NASA EONET' }
  const analogues = analogueSettled.status === 'fulfilled' ? analogueSettled.value : null
  const test001Pair = test001Settled.status === 'fulfilled' ? test001Settled.value : null
  const test001Context = test001Pair ? { evidence: test001Pair[0], reference: test001Pair[1], connectivity: inspectLocalHydrologyContext() } : null

  sourceStatus.push(source(
    'terra-area-analysis',
    'Wieloletnia analiza obrazów',
    'Terra Worker · NASA GIBS · USGS Landsat · Copernicus Data Space',
    analysis && visuallyInspectedByModel > 0 ? 'PASS' : analysis || analysisRejectedAsMismatch ? 'INSUFFICIENT_DATA' : 'NOT_CONNECTED',
    'Model może analizować tylko jawnie oznaczone oryginalne oficjalne produkty satelitarne; katalog i produkty pochodne pozostają oddzielone.',
    analysis ? `${visuallyInspectedByModel} oryginalnych produktów satelitarnych przeszło bramkę wejścia modelu; ${analysis.landsat_catalog.matched} scen pasuje w katalogu Landsat.` : analysisSettled.status === 'rejected' ? String(analysisSettled.reason) : 'Brak odpowiedzi.',
    `${TERRA_EVIDENCE_API_URL}/research/analyze`,
  ))
  if (input.spatialMode === 'regional-patrol') {
    const patrol = analysis?.regional_patrol
    sourceStatus.push(source(
      'regional-patrol',
      'Patrol regionalny zbliżeń 1 km',
      'Terra Worker · NASA HLS S30 / ESA Sentinel-2 MSI',
      !patrol ? 'NOT_CONNECTED' : patrol.status === 'COMPLETE_SPARSE_SCREENING' ? 'PASS' : patrol.inspected_tiles ? 'WARNING' : 'INSUFFICIENT_DATA',
      'Przestrzenny przesiew próbek wewnątrz AOI; nie jest pełnym pokryciem ani szeregiem zmian w czasie.',
      patrol
        ? `${patrol.inspected_tiles}/${patrol.requested_tiles} kadrów obejrzanych; górna granica nominalnego pokrycia ${patrol.nominal_coverage_upper_bound_percent.toFixed(2)}%; data źródła ${patrol.source_date ?? 'nieustalona'}; natywna rozdzielczość ${patrol.nominal_resolution_m ?? 'nieustalona'} m.`
        : 'Worker nie zwrócił protokołu patrolu regionalnego.',
      `${TERRA_EVIDENCE_API_URL}/research/analyze`,
    ))
  }
  sourceStatus.push(source(
    'l4-water-protocol',
    'Protokół wodny L4 — treningi #3 i #4',
    'Terra public training evidence',
    analysis?.analysis_protocol ? 'WARNING' : 'NOT_CONNECTED',
    'Kontekst procedury i audytu porównań wieloletnich; nie jest środowiskową prawdą terenową ani uruchomionym checkpointem modelu.',
    analysis?.analysis_protocol
      ? `#3: ${analysis.analysis_protocol.training_3.streamed_windows} okien / ${analysis.analysis_protocol.training_3.research_region_count} regionów; #4: ${analysis.analysis_protocol.training_4.unique_real_scientific_pairs} par, ${analysis.analysis_protocol.training_4.validation_pairs} walidacyjnych, ${analysis.analysis_protocol.training_4.steps} kroków; checkpoint Worker: NIE.`
      : 'Worker nie zwrócił kontekstu protokołu treningowego.',
    `${TERRA_EVIDENCE_API_URL}/cases`,
  ))
  sourceStatus.push(source(
    'yearly-gallery',
    'Roczna galeria kontrolna',
    'USGS Landsat Collection 2 / NASA GIBS fallback',
    gallery.slots.some(item => item.status === 'image') ? (gallery.failedBatches ? 'WARNING' : 'PASS') : 'NOT_CONNECTED',
    'Jeden jawnie opisany slot na żądany rok; sama obecność obrazu nie oznacza analizy przez model.',
    `${gallery.slots.filter(item => item.status === 'image').length}/${gallery.requestedYears.length} lat ma obraz; ${gallery.failedBatches} partii nie odpowiedziało.`,
    `${TERRA_EVIDENCE_API_URL}/research/yearly-gallery`,
  ))
  sourceStatus.push(source(
    'copernicus-dem',
    'Profil wysokościowy',
    'Copernicus DEM GLO-90 przez Open-Meteo',
    elevation.state === 'OBSERVATION' ? 'PASS' : elevation.state === 'NOT_CONNECTED' ? 'NOT_CONNECTED' : 'INSUFFICIENT_DATA',
    'Kontekst rzeźby; nie zastępuje niwelacji ani modelu przepływu.',
    elevation.state === 'OBSERVATION' ? `${elevation.samples.length} próbek rastrowych.` : ('error' in elevation ? String(elevation.error) : 'Brak próbek.'),
    'https://open-meteo.com/en/docs/elevation-api',
  ))
  sourceStatus.push(source(
    'nasa-eonet',
    'Bieżący kontekst zdarzeń',
    'NASA EONET v3',
    eventsSettled.status === 'fulfilled' ? (events.observations.length ? 'WARNING' : 'INSUFFICIENT_DATA') : 'NOT_CONNECTED',
    'Tylko otwarte zdarzenia z ostatnich 60 dni w szerokim filtrze przestrzennym; nie jest to historia całego okresu.',
    `${events.observations.length} zdarzeń kontekstowych.`,
    'https://eonet.gsfc.nasa.gov/api/v3/events',
  ))
  if (needsWaterAnalogues) sourceStatus.push(source(
    'global-water-casebook',
    'Analogie z kilkunastu regionów świata',
    'Terraforming Planet validated global water casebooks',
    analogues ? (analogues.failedCatalogs.length ? 'WARNING' : 'PASS') : 'NOT_CONNECTED',
    'Analogie uczą możliwych mechanizmów, lecz nigdy nie dowodzą lokalnej przyczyny.',
    analogues ? `${analogues.searchedCases} przypadków przeszukano; ${analogues.selectedCases.length} regionów wybrano.` : 'Baza nie odpowiedziała.',
    'https://terraforming-planet.github.io/Polar-Sun-Moon-Analysis/data/hydrology/global-water-casebook.json',
  ))
  if (isTest001) sourceStatus.push(source(
    'test001-recorded',
    'TEST 001 — zapisany wynik stawu przy Jeziorze Kuchnia',
    'Terra public evidence repository',
    test001Context ? 'WARNING' : 'NOT_CONNECTED',
    'Preset wnosi zapisaną anomalię, nie potwierdzoną przyczynę.',
    test001Context ? 'Powtarzalne obrazy silnie wspierają niemal całkowity zanik historycznego trwałego lustra; dokładna resztkowa powierzchnia 2026 i przyczyna pozostają nieustalone.' : 'Źródło nie odpowiedziało.',
    'https://terraforming-planet.github.io/Polar-Sun-Moon-Analysis/experiment-001/',
  ))

  if (analysis) provenance.push(sourceProvenance('Representative official/public EO imagery and Landsat catalogue', areaLabel, 'analyze_multiyear_imagery', `${TERRA_EVIDENCE_API_URL}/research/analyze`, { period: analysis.period, depth: analysis.depth, originalModelImageCount: visuallyInspectedByModel, imageryAuthenticityPolicy: analysis.imagery_authenticity_policy ?? null, landsatMatched: analysis.landsat_catalog.matched, visualFocus: analysis.visual_focus ?? null, regionalPatrol: analysis.regional_patrol ?? null }, 'Model oglądał wyłącznie obrazy, które przeszły jawną bramkę ORIGINAL_OFFICIAL_SATELLITE_PRODUCT; produkty pochodne i obrazy AI nie są wejściami modelu. Zbliżenie poprawia rejestrację celu, nie natywną rozdzielczość sensora. Patrol regionalny jest rzadkim przesiewem, nie pełnym pokryciem.'))
  provenance.push(sourceProvenance('Year-by-year NASA HLS/WELD AOI, USGS browse and NASA GIBS fallback gallery', areaLabel, 'retrieve_multiyear_imagery', `${TERRA_EVIDENCE_API_URL}/research/yearly-gallery`, { years: gallery.requestedYears, season: input.season, returnedImages: gallery.slots.filter(item => item.status === 'image').length }, 'Galeria służy do kontroli i wyboru scen. Nie każdy obraz został obejrzany przez model.'))
  provenance.push(...elevation.provenance, ...events.provenance)
  if (analogues) provenance.push(...analogues.provenance)
  if (test001Context) provenance.push(...test001Context.evidence.provenance, ...test001Context.reference.provenance)

  const observations: InvestigationObservation[] = []
  if (analysis && visuallyInspectedByModel > 0) {
    observations.push(
      { evidenceClass: 'OBSERVATION', statement: analysis.analysis.what_is_visible, source: 'Terra Worker — obrazy faktycznie przeanalizowane przez model', limitation: 'Opis wizualny nie jest pomiarem terenowym ani dowodem przyczyny.' },
      { evidenceClass: 'OBSERVATION', statement: analysis.analysis.change_over_time, source: 'Terra Worker — porównanie reprezentatywnych dat', limitation: `Model obejrzał ${visuallyInspectedByModel} jawnie oznaczonych oryginalnych produktów satelitarnych, a nie każdy rok z galerii.` },
      { evidenceClass: 'OBSERVATION', statement: analysis.analysis.water_assessment, source: 'Terra Worker — ocena widocznej wody', limitation: 'Widoczność wody zależy od rozdzielczości, chmur, roślinności i sezonu.' },
      ...analysis.analysis.notable_features.map(statement => ({ evidenceClass: 'OBSERVATION' as const, statement, source: 'Terra Worker — cecha w obrazie', limitation: 'Cecha jest kandydatem obserwacyjnym, nie mechanizmem przyczynowym.' })),
    )
    const hydrology = analysis.analysis.hydrology_screening
    if (hydrology) {
      observations.push(
        { evidenceClass: 'OBSERVATION', statement: `Przesiew zmiany wody: ${hydrology.water_change_state}. ${hydrology.temporal_basis}`, source: 'Terra Worker — ustrukturyzowany przesiew hydrologiczny', limitation: 'Kandydat ze scen reprezentatywnych; nie jest pomiarem objętości ani dowodem przyczyny.' },
        { evidenceClass: 'OBSERVATION', statement: `Dopływy/odpływy: ${hydrology.inflow_outflow_status}. ${hydrology.main_and_tributary_context}`, source: 'Terra Worker — ustrukturyzowany przesiew hydrologiczny', limitation: 'Widoczna geometria nie ustanawia kierunku ani drożności; wymaga oficjalnej hydrografii, DEM, pomiarów i kontroli terenowej.' },
      )
    }
  }
  observations.push({ evidenceClass: 'CATALOGUE_METADATA', statement: `${gallery.slots.filter(item => item.status === 'image').length} z ${gallery.requestedYears.length} żądanych lat ma oficjalny obraz AOI, podgląd lub jawny fallback.`, source: 'NASA HLS/WELD/GIBS · USGS Landsat', limitation: 'Metadane i podgląd nie oznaczają automatycznego pomiaru zmiany.' })
  if (analysis?.regional_patrol) observations.push({
    evidenceClass: 'OBSERVATION',
    statement: `Patrol regionalny: model obejrzał ${analysis.regional_patrol.inspected_tiles} z ${analysis.regional_patrol.requested_tiles} kadrów po ${analysis.regional_patrol.frame_width_km.toFixed(1)} km; górna granica nominalnego pokrycia AOI wynosi ${analysis.regional_patrol.nominal_coverage_upper_bound_percent.toFixed(2)}%.`,
    source: 'Terra Worker — manifest patrolu HLS S30',
    limitation: 'To rzadkie próbki z jednej daty, nie pełne pokrycie ani samodzielny dowód zmiany w czasie; obszary między kadrami pozostają niesprawdzone.',
  })
  if (elevation.state === 'OBSERVATION') observations.push({ evidenceClass: 'OBSERVATION', statement: `Pobrano ${elevation.samples.length} próbek Copernicus DEM w profilu przez AOI.`, source: 'Open-Meteo / Copernicus DEM GLO-90', limitation: 'Próbki rastrowe nie są niwelacją terenową ani automatycznym kierunkiem przepływu.' })
  for (const item of events.observations) observations.push({ evidenceClass: 'CONTEXT_ONLY', statement: `${item.title} (${item.date})`, source: `NASA EONET · ${item.source}`, limitation: 'Bieżący kontekst z szerokiego filtra; nie ustanawia związku z badaną zmianą.' })
  if (test001Context) observations.push({ evidenceClass: 'ANOMALY', statement: `TEST 001: porównanie tego samego stałego kadru silnie wspiera niemal całkowity zanik historycznego trwałego lustra wody. Centralny historyczny obrys wynosi około ${test001Context.evidence.recordedResult.historicalPersistentFootprintHa.toFixed(2)} ha (zakres powtarzalnych obrazów ${(test001Context.evidence.recordedResult.repeatSupportedRangeM2[0] / 10_000).toFixed(2)}–${(test001Context.evidence.recordedResult.repeatSupportedRangeM2[1] / 10_000).toFixed(2)} ha).`, source: 'Terra TEST 001 recorded fixed-crop measurement', limitation: 'To szacunek zaniku historycznego obrysu, nie dokładny pomiar resztkowej wody w 2026 ani dowód przyczyny.' })

  const signals = screenSignals(analysis, input.hazardTypes)
  const recordedAnomaly = Boolean(test001Context?.evidence.recordedResult.stateChangeSupported)
  const hypotheses = rankCausalHypotheses(input.hazardTypes, signals, recordedAnomaly)
  const hydrology = analysis?.analysis.hydrology_screening
  const waterEvidenceInconclusive = needsWaterAnalogues && (
    !hydrology
    || hydrology.water_change_state === 'INSUFFICIENT_EVIDENCE'
    || hydrology.visible_water_extrema?.status === 'INSUFFICIENT_EVIDENCE'
  )
  const signalState: HazardInvestigationResult['signalState'] = recordedAnomaly
    ? 'RECORDED_ANOMALY'
    : signals.length
      ? 'SCREENING_CANDIDATE'
      : visuallyInspectedByModel
        ? waterEvidenceInconclusive ? 'INCONCLUSIVE_EVIDENCE' : 'NO_ANOMALY_ESTABLISHED'
        : 'IMAGERY_NOT_VISUALLY_INSPECTED'
  const classification: EvidenceState = signalState === 'IMAGERY_NOT_VISUALLY_INSPECTED' || signalState === 'INCONCLUSIVE_EVIDENCE'
    ? 'INSUFFICIENT_DATA'
    : signalState === 'NO_ANOMALY_ESTABLISHED'
      ? 'OBSERVATION'
      : 'HYPOTHESIS'
  const alertDraft = draftPreliminaryAlert({ region: resolvedName, hazards: input.hazardTypes, hasRecordedAnomaly: recordedAnomaly, signals, visualImageCount: visuallyInspectedByModel })
  const requiredFieldChecks = fieldChecks(input.hazardTypes, hydrology, Boolean(test001Context))
  const verification: VerificationResult = {
    state: classification === 'INSUFFICIENT_DATA' ? 'INSUFFICIENT_DATA' : 'WARNING',
    checks: [
      `${visuallyInspectedByModel} obrazów przekazano do faktycznej analizy wizualnej`,
      `${gallery.requestedYears.length} lat żądano w galerii; ${gallery.slots.filter(item => item.status === 'image').length} ma obraz`,
      `${provenance.length} zapisów pochodzenia dołączono`,
      recordedAnomaly ? 'TEST 001 zachowano jako zapisaną anomalię bez automatycznej przyczyny' : 'Brak zapisanego wyniku terenowego dla tego AOI',
      hydrology ? `Przesiew sieci wodnej: ${hydrology.inflow_outflow_status}; przyczyna: ${hydrology.cause_status}` : 'Worker nie zwrócił ustrukturyzowanego przesiewu sieci wodnej',
      analysis?.analysis_protocol ? 'L4 #3/#4 użyto jako protokołu audytu; checkpoint L4 nie jest załadowany przez Worker' : 'Brak kontekstu protokołu L4 w odpowiedzi Worker',
      'Alert pozostaje szkicem i nie został wysłany',
    ],
    evidenceReferences: provenance.map(item => String(item.requestParameters.sourceUrl ?? item.dataset)),
    uncertainties: [
      'Analiza wizualna obejmuje reprezentatywne obrazy, a nie dowolny piksel każdego roku.',
      'Roczne obrazy mogą różnić się zachmurzeniem, sensorem, sezonem i rozdzielczością.',
      'Katalog Landsat przed 2000 r. może potwierdzać dostępność scen bez ich wizualnej analizy w tym przebiegu.',
      'Nie ma automatycznego dostępu do dokumentacji wszystkich lokalnych przepustów, rowów, poborów i robót.',
      'Przyczyna oraz poziom zagrożenia wymagają pomiarów terenowych i decyzji właściwych ekspertów.',
    ],
    timestamp: new Date().toISOString(),
    reason: signalState === 'INCONCLUSIVE_EVIDENCE'
      ? 'Obrazy obejrzano, lecz nie było dość porównywalnych danych do rozstrzygnięcia zmiany; nie wolno zamieniać tego wyniku w „brak anomalii”.'
      : classification === 'INSUFFICIENT_DATA'
        ? 'Nie wykonano wiarygodnej analizy wizualnej; wynik nie może ustanowić zagrożenia.'
        : 'Zebrano materiał obserwacyjny do hipotez, lecz bez niezależnej weryfikacji terenowej nie wolno ustanowić przyczyny ani VERIFIED_FINDING.',
  }
  if (needsWaterAnalogues) toolsExecuted.push('screen_main_tributary_inflow_outflow_network')
  if (input.spatialMode === 'regional-patrol') toolsExecuted.push('inspect_regional_patrol_tiles')
  toolsExecuted.push('rank_causal_hypotheses', 'draft_preliminary_risk_alert', 'propose_recovery_options', 'verify_evidence')

  const agents: InvestigationAgent[] = [
    { name: 'Terra Agentic EO Coordinator', role: 'Rozdziela AOI, okres, źródła i bramki dowodowe.', tool: 'run_hazard_investigation', status: 'PASS', result: `${resolvedName} · ${input.startYear}–${input.endYear}` },
    { name: 'Copernicus/ESA Source Agent (nasz agent)', role: 'Korzysta ze źródeł Copernicus/ESA; nie jest agentem prowadzonym ani zatwierdzonym przez ESA.', tool: 'analyze_multiyear_imagery', status: sourceStatus.find(item => item.id === 'terra-area-analysis')?.state ?? 'NOT_CONNECTED', result: `${visuallyInspectedByModel} obrazów przeanalizowanych wizualnie.` },
    { name: 'Multi-year Imagery Analyst', role: 'Porównuje reprezentatywne sceny i oddziela je od lat katalogowych.', tool: 'retrieve_multiyear_imagery', status: sourceStatus.find(item => item.id === 'yearly-gallery')?.state ?? 'NOT_CONNECTED', result: `${gallery.slots.filter(item => item.status === 'image').length}/${gallery.requestedYears.length} slotów obrazowych.` },
    { name: 'Directed Water Network Analyst', role: 'Oddzielnie śledzi ciek główny, dopływy boczne, dopływy, odpływy, rowy, przepusty oraz kontrolę powyżej/poniżej.', tool: 'screen_main_tributary_inflow_outflow_network', status: !needsWaterAnalogues ? 'INSUFFICIENT_DATA' : hydrology ? (hydrology.inflow_outflow_status === 'VISIBLE_CANDIDATES' ? 'WARNING' : 'INSUFFICIENT_DATA') : 'NOT_CONNECTED', result: hydrology ? `${hydrology.water_change_state}; ${hydrology.inflow_outflow_status}; przyczyna nieustalona.` : 'Brak ustrukturyzowanego przesiewu hydrologicznego.' },
    { name: 'Terrain & Hydrology Analyst', role: 'Sprawdza kontekst rzeźby bez wyznaczania kierunku przepływu wyłącznie z DEM.', tool: 'get_elevation_profile', status: sourceStatus.find(item => item.id === 'copernicus-dem')?.state ?? 'NOT_CONNECTED', result: elevation.state === 'OBSERVATION' ? `${elevation.samples.length} próbek DEM.` : 'Brak wiarygodnego profilu.' },
    { name: 'Hazard Specialist Agents', role: `Obsługują wybrane klasy: ${input.hazardTypes.map(item => HAZARD_LABELS[item]).join(', ')}.`, tool: 'rank_causal_hypotheses', status: classification === 'INSUFFICIENT_DATA' ? 'INSUFFICIENT_DATA' : 'WARNING', result: `${hypotheses.length} konkurencyjnych hipotez; żadna nie jest automatycznie przyczyną.` },
    { name: 'Global Analogue Scout', role: 'Szuka mechanizmów w odrębnych regionach bez przenoszenia przyczyny.', tool: 'find_global_water_analogues', status: needsWaterAnalogues ? (analogues ? 'WARNING' : 'NOT_CONNECTED') : 'INSUFFICIENT_DATA', result: needsWaterAnalogues ? `${analogues?.selectedCases.length ?? 0} analogii kontekstowych.` : 'Dla wybranej klasy nie użyto wodnego casebooka.' },
    { name: 'Evidence Verifier', role: 'Pilnuje klas OBSERVATION → ANOMALY → HYPOTHESIS → ALERT → VERIFIED FINDING.', tool: 'verify_evidence', status: verification.state === 'INSUFFICIENT_DATA' ? 'INSUFFICIENT_DATA' : 'WARNING', result: verification.reason },
    { name: 'Alert & Public Safety Planner', role: 'Tworzy wyłącznie szkic komunikatu dla człowieka i właściwych służb.', tool: 'draft_preliminary_risk_alert', status: alertDraft.status === 'DRAFT_REQUIRES_HUMAN_APPROVAL' ? 'WARNING' : 'INSUFFICIENT_DATA', result: `${alertDraft.status}; ${alertDraft.delivery}.` },
    { name: 'Restoration Engineering Planner', role: 'Podaje warianty warunkowe z bramką projektu, pozwoleń i odpowiedzialnego organu.', tool: 'propose_recovery_options', status: 'WARNING', result: `${proposeRecoveryOptions(input.hazardTypes).length} opcji warunkowych.` },
  ]
  if (input.spatialMode === 'regional-patrol') {
    const patrol = analysis?.regional_patrol
    agents.splice(2, 0, {
      name: 'Regional Tile Patrol Agent',
      role: 'Ogląda osobne zbliżenia 1 km rozłożone w AOI i raportuje kandydatów z identyfikatorem kadru.',
      tool: 'inspect_regional_patrol_tiles',
      status: !patrol ? 'NOT_CONNECTED' : patrol.inspected_tiles === patrol.requested_tiles ? 'PASS' : patrol.inspected_tiles ? 'WARNING' : 'INSUFFICIENT_DATA',
      result: patrol ? `${patrol.inspected_tiles}/${patrol.requested_tiles} kadrów; maksymalnie ${patrol.nominal_coverage_upper_bound_percent.toFixed(2)}% nominalnego AOI.` : 'Brak manifestu patrolu.',
    })
  }

  return {
    schemaVersion: '2.0',
    workflowVersion: 'terra-labmcp-hazard-investigation-v2',
    runId: crypto.randomUUID(),
    requestedAt,
    completedAt: new Date().toISOString(),
    classification,
    signalState,
    qaStatus: verification.state === 'INSUFFICIENT_DATA' ? 'INSUFFICIENT_DATA' : 'WARNING',
    humanDecision: 'REQUIRED_BEFORE_PUBLICATION_OR_INTERVENTION',
    area: { requestedName: input.regionQuery, resolvedName, latitude, longitude, radiusKm: input.radiusKm, resolutionMethod, alternativeMatches },
    period: { startYear: input.startYear, endYear: input.endYear, season: input.season, timelineMode: input.timelineMode },
    hazards: input.hazardTypes,
    sourceStatus,
    agents,
    toolsExecuted,
    imagery: {
      requestedYears: gallery.requestedYears,
      slots: gallery.slots,
      visuallyInspectedByModel,
      galleryImageSlotsNotClaimedAsInspected: gallery.slots.filter(item => item.status === 'image').length,
      missingYears: gallery.slots.filter(item => item.status === 'missing').length,
      analysis,
      warning: isTest001
        ? 'TEST 001 używa skorygowanego środka stawu i zarejestrowanego pomiaru w stałym kadrze ~469 m. Model przyjmuje wyłącznie jawnie oznaczone oryginalne produkty satelitarne; nakładki pomiarowe są oddzielnymi produktami pochodnymi. Zbliżenie nie zwiększa natywnej rozdzielczości sensora.'
        : analysis?.regional_patrol
          ? `Tylko obrazy, które przeszły bramkę oryginału, są liczone jako obejrzane przez model. Patrol obejrzał ${analysis.regional_patrol.inspected_tiles}/${analysis.regional_patrol.requested_tiles} zbliżeń; jego nominalne pokrycie to najwyżej ${analysis.regional_patrol.nominal_coverage_upper_bound_percent.toFixed(2)}%, więc nie sprawdzono całego AOI. Zbliżenie nie zwiększa natywnej rozdzielczości sensora.`
          : 'Tylko obrazy, które przeszły bramkę oryginału, są liczone jako obejrzane przez model. Galeria roczna jest materiałem źródłowym do kontroli człowieka, nie automatycznie przeanalizowanym szeregiem.',
    },
    observations,
    screeningSignals: signals,
    hypotheses,
    alertDraft,
    recoveryOptions: proposeRecoveryOptions(input.hazardTypes),
    requiredFieldChecks,
    verification,
    promotionGate: {
      verifiedFindingAllowed: false,
      currentStage: classification,
      requirements: ['Niezależna kontrola terenowa z datą i metodą', 'Załączone pomiary lub dokument urzędowy', 'Wskazanie odpowiedzialnego eksperta', 'Jawne źródło HTTPS', 'Akceptacja człowieka dla dokładnie opisanego stwierdzenia'],
    },
    analogues,
    test001Context,
    provenance,
    limitations: [
      'Aplikacja generuje hipotezy i szkice alertów; nie zastępuje służb, badań terenowych ani projektu technicznego.',
      'Wyraźny wzór w obrazie może silnie wspierać potrzebę kontroli, lecz sam nie dowodzi mechanizmu hydrologicznego, geotechnicznego ani sprawcy.',
      'Aplikacja niczego automatycznie nie publikuje, nie wysyła do urzędu i nie uruchamia robót.',
      'Treningi L4 #3/#4 dostarczają protokół analizy i audytu, lecz ich metryki nie są dowodem zmiany środowiska; checkpoint L4 nie jest załadowany w Workerze.',
      '„Agent ESA” oznacza naszego agenta korzystającego ze źródeł Copernicus/ESA, a nie agenta obsługiwanego lub zatwierdzonego przez ESA.',
    ],
  }
}
