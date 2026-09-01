import type { EvidenceState, ProvenanceRecord, VerificationResult } from '../../types/core'
import { findObservations, getElevationProfile, searchLocation } from './adapter'
import {
  findGlobalWaterAnalogues,
  inspectLocalHydrologyContext,
  inspectTest001Evidence,
  resolveReferenceDataset,
  type AnalogueSearch,
  type ConnectivityContextItem,
  type ReferenceResolution,
  type Test001Evidence,
} from './labmcp'

export const TERRA_EVIDENCE_API_URL = 'https://terra-observation-evidence-explainer.xodobrox.workers.dev'

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
  referenceQuery?: string
}

export type WorkerAreaAnalysis = {
  service: string
  generated_at_utc: string
  area: { place_name: string | null; latitude: number; longitude: number; radius_km: number }
  period: { start_date: string; end_date: string }
  depth: 'quick' | 'deep'
  preview_images: Array<{ date: string; source: string; url: string }>
  analysis_images?: Array<{ date: string; source: string; url: string }>
  ai_visual_image_count: number
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
    notable_features: string[]
    confidence: { level: 'low' | 'medium' | 'high'; reason: string }
    limitations: string[]
    recommended_next_step: string
  }
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
    asset_kind?: 'FULL_RESOLUTION_BROWSE' | 'CATALOGUE_THUMBNAIL' | 'NASA_GIBS_AOI_FALLBACK'
    render_kind?: 'CATALOGUE_BROWSE' | 'NATURAL_COLOR_RGB'
    aoi_cropped?: boolean
    analysis_eligible?: boolean
    quality_note?: string
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
  signalState: 'RECORDED_ANOMALY' | 'SCREENING_CANDIDATE' | 'NO_ANOMALY_ESTABLISHED' | 'IMAGERY_NOT_VISUALLY_INSPECTED'
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
  screeningSignals: Array<{ hazardType: HazardType; matchedText: string; meaning: 'TEXT_SCREENING_CANDIDATE_NOT_CAUSAL_PROOF' }>
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
  if (!Number.isInteger(input.startYear) || input.startYear < 1972 || input.startYear > currentYear) throw new Error(`Rok początkowy musi mieścić się w zakresie 1972–${currentYear}.`)
  if (!Number.isInteger(input.endYear) || input.endYear < input.startYear || input.endYear > currentYear) throw new Error(`Rok końcowy musi mieścić się między rokiem początkowym a ${currentYear}.`)
  if (!input.hazardTypes.length) throw new Error('Wybierz co najmniej jeden typ zagrożenia.')
  if (input.hazardTypes.some(item => !HAZARD_TYPES.includes(item))) throw new Error('Nieznany typ zagrożenia.')
}

function seasonRange(startYear: number, endYear: number, season: InvestigationSeason) {
  const [start, end] = SEASON_DATES[season]
  return { startDate: `${startYear}-${start}`, endDate: `${endYear}-${end}` }
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

export async function analyzeMultiyearImagery(input: HazardInvestigationInput, latitude: number, longitude: number) {
  const range = seasonRange(input.startYear, input.endYear, input.season)
  const response = await fetch(`${TERRA_EVIDENCE_API_URL}/research/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      latitude,
      longitude,
      radius_km: input.radiusKm,
      start_date: range.startDate,
      end_date: range.endDate,
      place_name: input.regionQuery,
      depth: input.depth === 'deep' ? 'deep' : 'quick',
    }),
  })
  return readJson<WorkerAreaAnalysis>(response)
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

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radians = (value: number) => value * Math.PI / 180
  const deltaLat = radians(lat2 - lat1)
  const deltaLon = radians(lon2 - lon1)
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(deltaLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function screenSignals(analysis: WorkerAreaAnalysis | null, hazards: HazardType[]) {
  if (!analysis || analysis.ai_visual_image_count < 1) return []
  const sentences = [
    analysis.analysis.change_over_time,
    analysis.analysis.water_assessment,
    ...analysis.analysis.notable_features,
  ].flatMap(value => value.split(/(?<=[.!?])\s+/)).map(value => value.trim()).filter(Boolean)
  const signals: HazardInvestigationResult['screeningSignals'] = []
  for (const hazardType of hazards) {
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

function fieldChecks(hazards: HazardType[]) {
  return [...new Set(hazards.flatMap(hazard => HYPOTHESIS_LIBRARY[hazard].flatMap(item => item.checks)))].slice(0, 18)
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
  const isTest001 = haversineKm(latitude, longitude, 53.5914, 19.010717) <= 1
  const needsWaterAnalogues = input.hazardTypes.some(item => WATER_HAZARDS.has(item))
  const analysisPromise = analyzeMultiyearImagery(input, latitude, longitude)
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
    analysis && analysis.ai_visual_image_count > 0 ? 'PASS' : analysis ? 'INSUFFICIENT_DATA' : 'NOT_CONNECTED',
    'Model ogląda wybrane obrazy reprezentatywne; katalog nie jest udawany jako analiza wizualna.',
    analysis ? `${analysis.ai_visual_image_count} obrazów rzeczywiście przekazano do analizy; ${analysis.landsat_catalog.matched} scen pasuje w katalogu Landsat.` : analysisSettled.status === 'rejected' ? String(analysisSettled.reason) : 'Brak odpowiedzi.',
    `${TERRA_EVIDENCE_API_URL}/research/analyze`,
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
    test001Context ? 'Zarejestrowana zmiana stanu historycznego; dokładny stan 2026 i przyczyna pozostają niepotwierdzone.' : 'Źródło nie odpowiedziało.',
    'https://terraforming-planet.github.io/Polar-Sun-Moon-Analysis/experiment-001/',
  ))

  if (analysis) provenance.push(sourceProvenance('Representative official/public EO imagery and Landsat catalogue', areaLabel, 'analyze_multiyear_imagery', `${TERRA_EVIDENCE_API_URL}/research/analyze`, { period: analysis.period, depth: analysis.depth, aiVisualImageCount: analysis.ai_visual_image_count, landsatMatched: analysis.landsat_catalog.matched }, 'Model oglądał wyłącznie liczbę obrazów podaną w aiVisualImageCount; pozostałe wpisy katalogu to metadane.'))
  provenance.push(sourceProvenance('Year-by-year Landsat browse / NASA GIBS fallback gallery', areaLabel, 'retrieve_multiyear_imagery', `${TERRA_EVIDENCE_API_URL}/research/yearly-gallery`, { years: gallery.requestedYears, season: input.season, returnedImages: gallery.slots.filter(item => item.status === 'image').length }, 'Galeria służy do kontroli i wyboru scen. Nie każdy obraz został obejrzany przez model.'))
  provenance.push(...elevation.provenance, ...events.provenance)
  if (analogues) provenance.push(...analogues.provenance)
  if (test001Context) provenance.push(...test001Context.evidence.provenance, ...test001Context.reference.provenance)

  const observations: InvestigationObservation[] = []
  if (analysis && analysis.ai_visual_image_count > 0) {
    observations.push(
      { evidenceClass: 'OBSERVATION', statement: analysis.analysis.what_is_visible, source: 'Terra Worker — obrazy faktycznie przeanalizowane przez model', limitation: 'Opis wizualny nie jest pomiarem terenowym ani dowodem przyczyny.' },
      { evidenceClass: 'OBSERVATION', statement: analysis.analysis.change_over_time, source: 'Terra Worker — porównanie reprezentatywnych dat', limitation: `Model obejrzał ${analysis.ai_visual_image_count} obrazów, a nie każdy rok z galerii.` },
      { evidenceClass: 'OBSERVATION', statement: analysis.analysis.water_assessment, source: 'Terra Worker — ocena widocznej wody', limitation: 'Widoczność wody zależy od rozdzielczości, chmur, roślinności i sezonu.' },
      ...analysis.analysis.notable_features.map(statement => ({ evidenceClass: 'OBSERVATION' as const, statement, source: 'Terra Worker — cecha w obrazie', limitation: 'Cecha jest kandydatem obserwacyjnym, nie mechanizmem przyczynowym.' })),
    )
  }
  observations.push({ evidenceClass: 'CATALOGUE_METADATA', statement: `${gallery.slots.filter(item => item.status === 'image').length} z ${gallery.requestedYears.length} żądanych lat ma oficjalny obraz podglądowy lub jawny fallback.`, source: 'USGS Landsat / NASA GIBS', limitation: 'Metadane i podgląd nie oznaczają automatycznego pomiaru zmiany.' })
  if (elevation.state === 'OBSERVATION') observations.push({ evidenceClass: 'OBSERVATION', statement: `Pobrano ${elevation.samples.length} próbek Copernicus DEM w profilu przez AOI.`, source: 'Open-Meteo / Copernicus DEM GLO-90', limitation: 'Próbki rastrowe nie są niwelacją terenową ani automatycznym kierunkiem przepływu.' })
  for (const item of events.observations) observations.push({ evidenceClass: 'CONTEXT_ONLY', statement: `${item.title} (${item.date})`, source: `NASA EONET · ${item.source}`, limitation: 'Bieżący kontekst z szerokiego filtra; nie ustanawia związku z badaną zmianą.' })
  if (test001Context) observations.push({ evidenceClass: 'ANOMALY', statement: `TEST 001: publiczny zapis wspiera historyczną zmianę stanu widocznego lustra stawu o centralnym historycznym obrysie ${test001Context.evidence.recordedResult.historicalPersistentFootprintHa.toFixed(4)} ha.`, source: 'Terra TEST 001 recorded measurement', limitation: 'Dokładny obszar otwartej wody w 2026, procent utraty i przyczyna nie są opublikowanym wynikiem.' })

  const signals = screenSignals(analysis, input.hazardTypes)
  const recordedAnomaly = Boolean(test001Context?.evidence.recordedResult.stateChangeSupported)
  const hypotheses = rankCausalHypotheses(input.hazardTypes, signals, recordedAnomaly)
  const visuallyInspectedByModel = analysis?.ai_visual_image_count ?? 0
  const signalState: HazardInvestigationResult['signalState'] = recordedAnomaly
    ? 'RECORDED_ANOMALY'
    : signals.length
      ? 'SCREENING_CANDIDATE'
      : visuallyInspectedByModel
        ? 'NO_ANOMALY_ESTABLISHED'
        : 'IMAGERY_NOT_VISUALLY_INSPECTED'
  const classification: EvidenceState = signalState === 'IMAGERY_NOT_VISUALLY_INSPECTED'
    ? 'INSUFFICIENT_DATA'
    : signalState === 'NO_ANOMALY_ESTABLISHED'
      ? 'OBSERVATION'
      : 'HYPOTHESIS'
  const alertDraft = draftPreliminaryAlert({ region: resolvedName, hazards: input.hazardTypes, hasRecordedAnomaly: recordedAnomaly, signals, visualImageCount: visuallyInspectedByModel })
  const requiredFieldChecks = fieldChecks(input.hazardTypes)
  const verification: VerificationResult = {
    state: visuallyInspectedByModel || recordedAnomaly ? 'WARNING' : 'INSUFFICIENT_DATA',
    checks: [
      `${visuallyInspectedByModel} obrazów przekazano do faktycznej analizy wizualnej`,
      `${gallery.requestedYears.length} lat żądano w galerii; ${gallery.slots.filter(item => item.status === 'image').length} ma obraz`,
      `${provenance.length} zapisów pochodzenia dołączono`,
      recordedAnomaly ? 'TEST 001 zachowano jako zapisaną anomalię bez automatycznej przyczyny' : 'Brak zapisanego wyniku terenowego dla tego AOI',
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
    reason: classification === 'INSUFFICIENT_DATA' ? 'Nie wykonano wiarygodnej analizy wizualnej; wynik nie może ustanowić zagrożenia.' : 'Zebrano materiał obserwacyjny do hipotez, lecz bez niezależnej weryfikacji terenowej nie wolno ustanowić przyczyny ani VERIFIED_FINDING.',
  }
  toolsExecuted.push('rank_causal_hypotheses', 'draft_preliminary_risk_alert', 'propose_recovery_options', 'verify_evidence')

  const agents: InvestigationAgent[] = [
    { name: 'Terra Agentic EO Coordinator', role: 'Rozdziela AOI, okres, źródła i bramki dowodowe.', tool: 'run_hazard_investigation', status: 'PASS', result: `${resolvedName} · ${input.startYear}–${input.endYear}` },
    { name: 'Copernicus/ESA Source Agent (nasz agent)', role: 'Korzysta ze źródeł Copernicus/ESA; nie jest agentem prowadzonym ani zatwierdzonym przez ESA.', tool: 'analyze_multiyear_imagery', status: sourceStatus.find(item => item.id === 'terra-area-analysis')?.state ?? 'NOT_CONNECTED', result: `${visuallyInspectedByModel} obrazów przeanalizowanych wizualnie.` },
    { name: 'Multi-year Imagery Analyst', role: 'Porównuje reprezentatywne sceny i oddziela je od lat katalogowych.', tool: 'retrieve_multiyear_imagery', status: sourceStatus.find(item => item.id === 'yearly-gallery')?.state ?? 'NOT_CONNECTED', result: `${gallery.slots.filter(item => item.status === 'image').length}/${gallery.requestedYears.length} slotów obrazowych.` },
    { name: 'Terrain & Hydrology Analyst', role: 'Sprawdza kontekst rzeźby oraz hipotezy dopływu/odpływu.', tool: 'get_elevation_profile', status: sourceStatus.find(item => item.id === 'copernicus-dem')?.state ?? 'NOT_CONNECTED', result: elevation.state === 'OBSERVATION' ? `${elevation.samples.length} próbek DEM.` : 'Brak wiarygodnego profilu.' },
    { name: 'Hazard Specialist Agents', role: `Obsługują wybrane klasy: ${input.hazardTypes.map(item => HAZARD_LABELS[item]).join(', ')}.`, tool: 'rank_causal_hypotheses', status: classification === 'INSUFFICIENT_DATA' ? 'INSUFFICIENT_DATA' : 'WARNING', result: `${hypotheses.length} konkurencyjnych hipotez; żadna nie jest automatycznie przyczyną.` },
    { name: 'Global Analogue Scout', role: 'Szuka mechanizmów w odrębnych regionach bez przenoszenia przyczyny.', tool: 'find_global_water_analogues', status: needsWaterAnalogues ? (analogues ? 'WARNING' : 'NOT_CONNECTED') : 'INSUFFICIENT_DATA', result: needsWaterAnalogues ? `${analogues?.selectedCases.length ?? 0} analogii kontekstowych.` : 'Dla wybranej klasy nie użyto wodnego casebooka.' },
    { name: 'Evidence Verifier', role: 'Pilnuje klas OBSERVATION → ANOMALY → HYPOTHESIS → ALERT → VERIFIED FINDING.', tool: 'verify_evidence', status: verification.state === 'INSUFFICIENT_DATA' ? 'INSUFFICIENT_DATA' : 'WARNING', result: verification.reason },
    { name: 'Alert & Public Safety Planner', role: 'Tworzy wyłącznie szkic komunikatu dla człowieka i właściwych służb.', tool: 'draft_preliminary_risk_alert', status: alertDraft.status === 'DRAFT_REQUIRES_HUMAN_APPROVAL' ? 'WARNING' : 'INSUFFICIENT_DATA', result: `${alertDraft.status}; ${alertDraft.delivery}.` },
    { name: 'Restoration Engineering Planner', role: 'Podaje warianty warunkowe z bramką projektu, pozwoleń i odpowiedzialnego organu.', tool: 'propose_recovery_options', status: 'WARNING', result: `${proposeRecoveryOptions(input.hazardTypes).length} opcji warunkowych.` },
  ]

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
      warning: 'Tylko ai_visual_image_count oznacza obrazy obejrzane przez model. Galeria roczna jest materiałem źródłowym do kontroli człowieka, nie automatycznie przeanalizowanym szeregiem.',
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
      '„Agent ESA” oznacza naszego agenta korzystającego ze źródeł Copernicus/ESA, a nie agenta obsługiwanego lub zatwierdzonego przez ESA.',
    ],
  }
}
