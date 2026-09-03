import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  HAZARD_LABELS,
  HAZARD_TYPES,
  getVisibleWaterExtrema,
  type HazardInvestigationInput,
  type HazardInvestigationResult,
  type HazardType,
  type WorkerAnalysisImage,
} from '../integrations/terra/hazardInvestigation'
import { getTool } from '../webmcp/registry'
import {
  DEFAULT_IMAGERY_DISPLAY,
  imageryDisplayFilter,
  normalizeImageryDisplay,
  selectModelPreviewImages,
  type ImageryDisplaySettings,
} from '../integrations/terra/imageryDisplay'
import { readLocalJson, writeLocalJson } from '../lib/storage'
import { compactReportText, mobilePreviewUrl } from '../lib/reportDisplay'
import {
  TEST_001_AOI,
  TEST_001_COMPARISON_IMAGES,
  TEST_001_EVIDENCE_REVISION,
  TEST_001_MEASUREMENT_URL,
} from '../integrations/terra/labmcp'
import {
  createResearchArchiveEntry,
  countMatchingResearchRuns,
  readResearchArchive,
  saveResearchArchiveEntry,
  type ResearchArchiveStorage,
} from '../lib/researchArchive'
import { ImageryControls } from './ImageryControls'
import { ProvenanceViewer } from './ProvenanceViewer'
import { StatusBadge } from './StatusBadge'

type ToolEnvelope = {
  state?: string
  data?: unknown
  error?: string
  verification?: string
}

type LocationMatch = { displayName: string; lat: number; lon: number }

const IMAGERY_DISPLAY_KEY = 'forgemcp.labterra.imageryDisplay.v1'

type FormState = {
  preset: 'test001' | 'vistula' | 'himalaya' | 'lake-chad' | 'custom'
  regionQuery: string
  latitude: string
  longitude: string
  radiusKm: string
  startYear: string
  endYear: string
  season: HazardInvestigationInput['season']
  hazards: HazardType[]
  depth: HazardInvestigationInput['depth']
  timelineMode: HazardInvestigationInput['timelineMode']
  spatialMode: 'overview' | 'regional-patrol'
}

const CURRENT_YEAR = new Date().getUTCFullYear()

const PRESETS: Record<Exclude<FormState['preset'], 'custom'>, Omit<FormState, 'preset'>> = {
  test001: {
    regionQuery: 'Staw leśny przy Jeziorze Kuchnia, Polska — TEST 001',
    latitude: '53.594595',
    longitude: '19.000140',
    radiusKm: '2',
    startYear: '1990',
    endYear: String(CURRENT_YEAR),
    season: 'autumn',
    hazards: ['water-loss', 'flow-obstruction', 'terrain-change'],
    depth: 'deep',
    timelineMode: 'annual',
    spatialMode: 'overview',
  },
  vistula: {
    regionQuery: 'Wisła — Gniew–Grudziądz, Polska — TEST 014',
    latitude: '53.660000',
    longitude: '18.790000',
    radiusKm: '35',
    startYear: '1990',
    endYear: String(CURRENT_YEAR),
    season: 'spring',
    hazards: ['flow-obstruction', 'terrain-change', 'flood'],
    depth: 'deep',
    timelineMode: 'representative',
    spatialMode: 'overview',
  },
  himalaya: {
    regionQuery: 'Himalaje / Wyżyna Tybetańska — TEST 015',
    latitude: '30.234961',
    longitude: '83.056124',
    radiusKm: '40',
    startYear: '1990',
    endYear: String(CURRENT_YEAR),
    season: 'winter',
    hazards: ['snow-avalanche', 'landslide', 'terrain-change'],
    depth: 'deep',
    timelineMode: 'representative',
    spatialMode: 'overview',
  },
  'lake-chad': {
    regionQuery: 'Lake Chad',
    latitude: '13.100000',
    longitude: '14.400000',
    radiusKm: '120',
    startYear: '1984',
    endYear: String(CURRENT_YEAR),
    season: 'autumn',
    hazards: ['water-loss', 'flow-obstruction', 'terrain-change'],
    depth: 'deep',
    timelineMode: 'representative',
    spatialMode: 'overview',
  },
}

const INITIAL_FORM: FormState = { preset: 'test001', ...PRESETS.test001 }

const STATION_HAZARDS: Partial<Record<string, HazardType[]>> = {
  arctic: ['snow-avalanche', 'landslide', 'terrain-change'],
  sahara: ['water-loss', 'flow-obstruction', 'terrain-change'],
  ocean: ['coastal-change', 'flood', 'water-loss'],
}

function isToolEnvelope(value: unknown): value is ToolEnvelope {
  return typeof value === 'object' && value !== null
}

function isHazardResult(value: unknown): value is HazardInvestigationResult {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && 'runId' in value && 'imagery' in value)
}

function readLocationMatches(value: unknown): LocationMatch[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  const results = (value as { results?: unknown }).results
  if (!Array.isArray(results)) return []
  return results.filter((item): item is LocationMatch => Boolean(
    item && typeof item === 'object' && !Array.isArray(item)
    && typeof (item as LocationMatch).displayName === 'string'
    && Number.isFinite((item as LocationMatch).lat)
    && Number.isFinite((item as LocationMatch).lon),
  ))
}

function sourceState(value: string) {
  const labels: Record<string, string> = {
    INCONCLUSIVE_EVIDENCE: 'NIEJEDNOZNACZNE DANE',
    NO_ANOMALY_ESTABLISHED: 'NIE POTWIERDZONO ANOMALII',
    IMAGERY_NOT_VISUALLY_INSPECTED: 'BRAK ANALIZY WIZUALNEJ',
    COMPLETE_SPARSE_SCREENING: '20 PRÓBEK SPRAWDZONYCH',
    PARTIAL_SPARSE_SCREENING: 'CZĘŚCIOWY PRZEGLĄD PRÓBEK',
    COMPLETE_TILE_REVIEW: 'PEŁNY OPIS KADRÓW',
    PARTIAL_TILE_REVIEW: 'CZĘŚCIOWY OPIS KADRÓW',
    INSUFFICIENT_EVIDENCE: 'NIEWYSTARCZAJĄCE DANE',
  }
  return labels[value] ?? value.replaceAll('_', ' ')
}

function cloudCoverLabel(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(1)}%` : 'brak metadanych'
}

type ImageOriginRecord = Pick<WorkerAnalysisImage, 'image_authenticity' | 'ai_generated'>

function isExplicitOriginalSatelliteImage(image: ImageOriginRecord) {
  return image.image_authenticity === 'ORIGINAL_OFFICIAL_SATELLITE_PRODUCT' && image.ai_generated === false
}

function imageOriginLabel(image: ImageOriginRecord) {
  if (image.ai_generated === true || image.image_authenticity === 'AI_GENERATED_IMAGE') return 'WYGENEROWANE PRZEZ AI · NIE JEST DOWODEM'
  if (image.image_authenticity === 'DERIVED_ANALYTICAL_PRODUCT') return 'PRODUKT POCHODNY · NIE JEST ORYGINALNYM ZDJĘCIEM'
  if (isExplicitOriginalSatelliteImage(image)) return 'ORYGINALNY OFICJALNY PRODUKT SATELITARNY · NIE AI'
  return 'POCHODZENIE NIEPOTWIERDZONE · NIE UŻYWAĆ JAKO DOWODU'
}

function archiveStatusMessage(storage: ResearchArchiveStorage, count: number, automatic: boolean) {
  const action = automatic ? 'Badanie zapisano automatycznie.' : 'Zapis badania potwierdzony.'
  if (storage === 'local') return `${action} Archiwum tej przeglądarki: ${count} ${count === 1 ? 'wpis' : 'wpisów'}.`
  if (storage === 'session') return `${action} Zapis jest tymczasowy do zamknięcia karty, ponieważ trwała pamięć przeglądarki jest zablokowana.`
  return `${action} Zapis działa tylko w tym otwartym widoku. Użyj „Eksportuj pełny JSON”, ponieważ przeglądarka blokuje pamięć.`
}

export function LabMcp() {
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState<FormState>(() => {
    const requestedRegion = searchParams.get('region')?.trim()
    const stationId = searchParams.get('station')
    if (!requestedRegion) return INITIAL_FORM
    return {
      ...INITIAL_FORM,
      preset: 'custom',
      regionQuery: requestedRegion,
      latitude: '',
      longitude: '',
      radiusKm: stationId === 'ocean' ? '100' : '25',
      hazards: STATION_HAZARDS[stationId ?? ''] ?? ['water-loss', 'terrain-change'],
    }
  })
  const [result, setResult] = useState<HazardInvestigationResult | null>(null)
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)
  const [placeMatches, setPlaceMatches] = useState<LocationMatch[]>([])
  const [placeStatus, setPlaceStatus] = useState('')
  const [searchingPlace, setSearchingPlace] = useState(false)
  const [showExtended, setShowExtended] = useState(false)
  const [showImagery, setShowImagery] = useState(false)
  const [showPatrolImagery, setShowPatrolImagery] = useState(false)
  const [archiveStatus, setArchiveStatus] = useState('')
  const [archiveEntries, setArchiveEntries] = useState(() => readResearchArchive())
  const [imageDimensions, setImageDimensions] = useState<Record<string, string>>({})
  const [failedImages, setFailedImages] = useState<Record<string, true>>({})
  const [imageryDisplay, setImageryDisplay] = useState<ImageryDisplaySettings>(() => normalizeImageryDisplay(readLocalJson(IMAGERY_DISPLAY_KEY, DEFAULT_IMAGERY_DISPLAY)))

  useEffect(() => {
    writeLocalJson(IMAGERY_DISPLAY_KEY, imageryDisplay)
  }, [imageryDisplay])

  const selectPreset = (preset: FormState['preset']) => {
    setPlaceMatches([])
    setPlaceStatus('')
    if (preset === 'custom') {
      setForm(current => ({ ...current, preset, regionQuery: '', latitude: '', longitude: '', radiusKm: '25', hazards: ['water-loss'], timelineMode: 'representative', spatialMode: 'overview' }))
      return
    }
    setForm({ preset, ...PRESETS[preset] })
  }

  const searchPlace = async () => {
    const query = form.regionQuery.trim()
    setPlaceMatches([])
    setPlaceStatus('')
    if (query.length < 2) {
      setPlaceStatus('Wpisz co najmniej 2 znaki nazwy miejscowości lub regionu.')
      return
    }
    setSearchingPlace(true)
    try {
      const response = await getTool('search_location')?.execute({ query })
      if (!isToolEnvelope(response)) throw new Error('Wyszukiwarka WebMCP jest niedostępna.')
      const matches = readLocationMatches(response.data)
      if (!matches.length) throw new Error(response.error ?? 'Nie znaleziono miejsca. Doprecyzuj nazwę, region lub państwo.')
      setPlaceMatches(matches)
      setPlaceStatus(`Znaleziono ${matches.length} wyników. Wybierz właściwy obszar.`)
    } catch (reason) {
      setPlaceStatus(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setSearchingPlace(false)
    }
  }

  const choosePlace = (match: LocationMatch) => {
    setForm(current => ({
      ...current,
      preset: 'custom',
      regionQuery: match.displayName,
      latitude: match.lat.toFixed(6),
      longitude: match.lon.toFixed(6),
    }))
    setPlaceMatches([])
    setPlaceStatus(`Wybrano: ${match.displayName}`)
  }

  const toggleHazard = (hazard: HazardType) => {
    setForm(current => ({
      ...current,
      hazards: current.hazards.includes(hazard)
        ? current.hazards.filter(item => item !== hazard)
        : [...current.hazards, hazard],
    }))
  }

  const persistResearch = (researchResult: HazardInvestigationResult, automatic: boolean) => {
    try {
      const saved = saveResearchArchiveEntry(createResearchArchiveEntry(researchResult, imageryDisplay))
      const confirmed = saved.entries.some(entry => entry.runId === researchResult.runId)
      if (!confirmed) throw new Error('Przeglądarka nie potwierdziła zapisu badania.')
      setArchiveEntries(saved.entries)
      setArchiveStatus(archiveStatusMessage(saved.storage, saved.entries.length, automatic))
    } catch (reason) {
      setArchiveStatus(reason instanceof Error ? reason.message : String(reason))
    }
  }

  const runConfiguredInvestigation = async (activeForm: FormState) => {
    setRunning(true)
    setError('')
    setResult(null)
    setArchiveStatus('')
    setShowExtended(false)
    setShowImagery(false)
    setShowPatrolImagery(false)
    setImageDimensions({})
    setFailedImages({})
    try {
      const latitude = activeForm.latitude.trim() ? Number(activeForm.latitude) : undefined
      const longitude = activeForm.longitude.trim() ? Number(activeForm.longitude) : undefined
      const input: HazardInvestigationInput = {
        regionQuery: activeForm.regionQuery,
        ...(latitude === undefined ? {} : { latitude }),
        ...(longitude === undefined ? {} : { longitude }),
        radiusKm: Number(activeForm.radiusKm),
        startYear: Number(activeForm.startYear),
        endYear: Number(activeForm.endYear),
        season: activeForm.season,
        hazardTypes: activeForm.hazards,
        depth: activeForm.depth,
        timelineMode: activeForm.timelineMode,
        spatialMode: activeForm.spatialMode,
        ...(activeForm.spatialMode === 'regional-patrol' ? { patrolTileCount: 20, patrolFrameWidthKm: 1 } : {}),
        referenceQuery: activeForm.preset === 'test001' ? 'Toruń' : undefined,
        ...(activeForm.preset === 'test001' ? {
          caseId: 'test-001-forest-pond-kuchnia' as const,
          focusLatitude: 53.594595,
          focusLongitude: 19.00014,
          focusRadiusKm: 0.25,
        } : {}),
      }
      const response = await getTool('run_hazard_investigation')?.execute(input)
      if (!isToolEnvelope(response) || !isHazardResult(response.data)) throw new Error(isToolEnvelope(response) ? response.error ?? 'LabMCP nie zwrócił wyniku strukturalnego.' : 'Narzędzie WebMCP jest niedostępne.')
      setResult(response.data)
      persistResearch(response.data, true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setRunning(false)
    }
  }

  const run = () => runConfiguredInvestigation(form)

  const runPinnedTest001 = () => {
    const test001Form: FormState = { preset: 'test001', ...PRESETS.test001 }
    setForm(test001Form)
    return runConfiguredInvestigation(test001Form)
  }

  const saveResearch = () => {
    if (!result) return
    persistResearch(result, false)
  }

  const exportJson = () => {
    if (!result) return
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${result.runId}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const recordImageLoad = (key: string, image: HTMLImageElement) => {
    const dimensions = `${image.naturalWidth}×${image.naturalHeight}`
    setImageDimensions(current => ({ ...current, [key]: dimensions }))
  }

  const recordImageFailure = (key: string) => {
    setFailedImages(current => ({ ...current, [key]: true }))
  }

  const modelPreviewPool = result?.imagery.analysis?.analysis_images ?? result?.imagery.analysis?.preview_images ?? []
  const originalModelPreviewPool = modelPreviewPool.filter(isExplicitOriginalSatelliteImage)
  const rejectedModelPreviewImages = modelPreviewPool.filter(image => !isExplicitOriginalSatelliteImage(image))
  const modelPreviewImages = result ? selectModelPreviewImages(originalModelPreviewPool, result.imagery.visuallyInspectedByModel) : []
  const overviewPreviewImages = modelPreviewImages.filter(image => image.evidence_role !== 'REGIONAL_PATROL_TILE')
  const patrolPreviewImages = modelPreviewImages.filter(image => image.evidence_role === 'REGIONAL_PATROL_TILE')
  const displayOnlyImages = result?.imagery.analysis?.derived_images ?? []
  const derivedDisplayImages = displayOnlyImages.filter(image => image.image_authenticity === 'DERIVED_ANALYTICAL_PRODUCT' && image.ai_generated === false)
  const additionalDerivedDisplayImages = derivedDisplayImages.filter(image => !String(image.evidence_role ?? '').startsWith('CURATED_TEST001_FIXED_CROP'))
  const generatedDisplayImages = displayOnlyImages.filter(image => image.image_authenticity === 'AI_GENERATED_IMAGE' || image.ai_generated === true)
  const displayFilter = imageryDisplayFilter(imageryDisplay)
  const displayFilterStyle = imageryDisplay.preset === 'natural'
    && imageryDisplay.brightness === 100
    && imageryDisplay.contrast === 100
    && imageryDisplay.saturation === 100
    && imageryDisplay.hue === 0
    ? undefined
    : { filter: displayFilter }
  const availableImageCount = result
    ? modelPreviewImages.length + additionalDerivedDisplayImages.length + generatedDisplayImages.length + result.imagery.slots.filter(item => item.status === 'image').length
    : 0
  const waterExtrema = result ? getVisibleWaterExtrema(result) : null
  const test001Record = result?.test001Context?.evidence.recordedResult ?? null
  const test001ComparisonImages = test001Record?.comparisonImages ?? []
  const test001DerivedComparisonImages = test001Record?.derivedComparisonImages ?? []
  const regionalPatrol = result?.imagery.analysis?.regional_patrol ?? null
  const regionalPatrolAssessment = result?.imagery.analysis?.analysis.regional_patrol_assessment ?? null
  const imageryAuthenticityPolicy = result?.imagery.analysis?.imagery_authenticity_policy ?? null
  const configuredRadiusKm = Number(form.radiusKm)
  const configuredAoiAreaKm2 = Number.isFinite(configuredRadiusKm) && configuredRadiusKm > 0 ? Math.PI * configuredRadiusKm * configuredRadiusKm : 0
  const configuredPatrolCoveragePercent = configuredAoiAreaKm2 > 0 ? Math.min(100, (20 / configuredAoiAreaKm2) * 100) : 0
  const archiveCount = archiveEntries.length
  const researchSeriesCount = countMatchingResearchRuns(archiveEntries, {
    latitude: Number(form.latitude),
    longitude: Number(form.longitude),
    radiusKm: Number(form.radiusKm),
    startYear: Number(form.startYear),
    endYear: Number(form.endYear),
    season: form.season,
    timelineMode: form.timelineMode,
    hazards: form.hazards,
    spatialMode: form.spatialMode,
  })
  const nextSeriesRun = Math.min(10, researchSeriesCount + 1)

  return <>
    <section className="card lab-hero">
      <div>
        <p className="eyebrow">LABTERRA WEBMCP · HIPOTETYCZNE ZAGROŻENIA I PRZYCZYNY</p>
        <h1>Laboratorium dochodzeń środowiskowych</h1>
        <p>Wskaż dowolny region i okres. Agenci pobiorą prawdziwe źródła satelitarne, oddzielą obrazy obejrzane przez model od samych metadanych, zbudują konkurencyjne hipotezy, szkic alertu i bezpieczne warianty naprawy lub regeneracji.</p>
      </div>
      <div className="lab-status-stack">
        <StatusBadge value={result?.classification ?? 'NOT RUN'} />
        <StatusBadge value={result ? sourceState(result.signalState) : 'AWAITING AREA'} />
        <StatusBadge value={result ? `QA ${result.qaStatus}` : 'FIELD VERIFICATION REQUIRED'} />
      </div>
    </section>

    <section className="card lab-verified-baseline" aria-label="Przypięty przykład oryginalnych zdjęć satelitarnych TEST 001">
      <div className="lab-section-title">
        <div><p className="eyebrow">DZIAŁAJĄCY PRZYKŁAD · TEST 001 · DWA ORYGINALNE ŹRÓDŁA</p><h2>Najpierw zobacz dowód, potem uruchom pełne dochodzenie</h2></div>
        <StatusBadge value="PINNED PUBLIC EVIDENCE" />
      </div>
      <p>Te dwa pliki są przypiętymi eksportami AOI z publicznego repozytorium badawczego: Landsat-5 z 2000 roku i Sentinel-2B z 2026 roku. Nie są obrazami AI ani pochodnymi maskami. Samo porównanie obrazów nie ustala przyczyny zmiany ani nie autoryzuje alarmu.</p>
      <div className="lab-imagery-grid lab-fixed-crop-grid lab-baseline-grid">
        {TEST_001_COMPARISON_IMAGES.map(image => {
          const imageKey = `baseline-original-${image.year}`
          const sourceName = image.year === 2000 ? 'Landsat-5 · 30 m' : 'Sentinel-2B · 10 m'
          return <figure key={image.year}>
            {failedImages[imageKey]
              ? <a className="lab-image-placeholder" href={image.url} target="_blank" rel="noreferrer">Podgląd nie został pobrany przez tę przeglądarkę. Otwórz przypięty plik źródłowy ↗</a>
              : <a className="lab-image-link" href={image.url} target="_blank" rel="noreferrer"><img src={image.url} loading="eager" decoding="async" alt={`Oryginalny obraz satelitarny TEST 001 z ${image.year} roku`} onLoad={event => recordImageLoad(imageKey, event.currentTarget)} onError={() => recordImageFailure(imageKey)} /></a>}
            <figcaption><StatusBadge value="ORYGINALNY OFICJALNY PRODUKT SATELITARNY · NIE AI" /><b>{image.year} · {sourceName}</b><small>przypięty natywny eksport AOI · wejście modelu w tej karcie: NIE · {imageDimensions[imageKey] ?? 'wczytywanie rozmiaru'}</small></figcaption>
          </figure>
        })}
      </div>
      <div className="toolbar">
        <button type="button" className="lab-primary" onClick={runPinnedTest001} disabled={running}>{running ? 'Trwa pełne dochodzenie…' : 'Uruchom pełne dochodzenie TEST 001'}</button>
        <a className="button-link" href={TEST_001_MEASUREMENT_URL} target="_blank" rel="noreferrer">Otwórz zapis pomiaru ↗</a>
      </div>
      <p className="lab-note"><b>Stały cel:</b> {TEST_001_AOI.pondFocus.lat.toFixed(6)}, {TEST_001_AOI.pondFocus.lon.toFixed(6)} · kadr analityczny {TEST_001_AOI.pondFocus.requestedFrameWidthM} m · rewizja dowodu <code>{TEST_001_EVIDENCE_REVISION.slice(0, 12)}</code>. Pełny przebieg może nadal zwrócić brak danych dla źródła chwilowo niedostępnego; ta karta nie podmienia wyniku dowolnego AOI.</p>
    </section>

    <section className="card lab-builder" aria-label="Konfiguracja dochodzenia środowiskowego">
      <div className="lab-section-title">
        <div><p className="eyebrow">LABTERRA WEBMCP</p><h2>Wyszukaj miejsce i ustaw zakres badania</h2></div>
        <p className="lab-note">Współrzędne są opcjonalne. TEST 001 pozostaje gotowym przykładem.</p>
      </div>

      <div className="lab-form-grid">
        <label>Preset badawczy
          <select value={form.preset} onChange={event => selectPreset(event.target.value as FormState['preset'])}>
            <option value="test001">TEST 001 · staw przy Jeziorze Kuchnia</option>
            <option value="vistula">TEST 014 · Wisła Gniew–Grudziądz</option>
            <option value="himalaya">TEST 015 · Himalaje / Tybet</option>
            <option value="lake-chad">Jezioro Czad · przykład globalny</option>
            <option value="custom">Własny region</option>
          </select>
        </label>
        <div className="lab-span-two lab-location-search">
          <label>Nazwa miejscowości lub regionu
            <span className="lab-inline-field"><input aria-label="Nazwa regionu" value={form.regionQuery} onChange={event => {
              setPlaceMatches([])
              setPlaceStatus('')
              setForm(current => ({ ...current, regionQuery: event.target.value, preset: 'custom', ...(current.preset === 'custom' ? {} : { latitude: '', longitude: '' }) }))
            }} placeholder="np. Toruń, jezioro, dolina rzeki, pasmo górskie" /><button type="button" onClick={searchPlace} disabled={searchingPlace}>{searchingPlace ? 'Szukam…' : 'Szukaj miejsca'}</button></span>
          </label>
        </div>
        <label>Szerokość WGS84 (opcjonalna)
          <input aria-label="Szerokość geograficzna" inputMode="decimal" value={form.latitude} onChange={event => setForm(current => ({ ...current, latitude: event.target.value, preset: 'custom' }))} placeholder="np. 53.591400" />
        </label>
        <label>Długość WGS84 (opcjonalna)
          <input aria-label="Długość geograficzna" inputMode="decimal" value={form.longitude} onChange={event => setForm(current => ({ ...current, longitude: event.target.value, preset: 'custom' }))} placeholder="np. 19.010717" />
        </label>
        <label>Promień AOI (km)
          <input aria-label="Promień AOI" type="number" min="1" max="500" value={form.radiusKm} onChange={event => setForm(current => ({ ...current, radiusKm: event.target.value }))} />
        </label>
        {form.preset === 'test001' ? <p className="lab-note lab-span-two"><b>Dokładny cel TEST 001:</b> środek stawu 53.594595, 19.000140 · obrazy analityczne mają stały kadr o szerokości 500 m. Regionalny AOI 2 km pozostaje tylko kontekstem.</p> : null}
        <label>Od roku
          <input aria-label="Rok początkowy" type="number" min="1972" max={CURRENT_YEAR} value={form.startYear} onChange={event => setForm(current => ({ ...current, startYear: event.target.value }))} />
        </label>
        <label>Do roku
          <input aria-label="Rok końcowy" type="number" min="1972" max={CURRENT_YEAR} value={form.endYear} onChange={event => setForm(current => ({ ...current, endYear: event.target.value }))} />
        </label>
        <label>Sezon porównawczy
          <select value={form.season} onChange={event => setForm(current => ({ ...current, season: event.target.value as FormState['season'] }))}>
            <option value="all">cały rok</option>
            <option value="spring">wiosna</option>
            <option value="summer">lato</option>
            <option value="autumn">jesień</option>
            <option value="winter">zima</option>
          </select>
        </label>
      </div>

      {placeStatus ? <p className="lab-place-status" role="status">{placeStatus}</p> : null}
      {placeMatches.length ? <div className="lab-location-results" role="list" aria-label="Wyniki wyszukiwania miejsca">
        {placeMatches.map(match => <button type="button" role="listitem" key={`${match.lat}-${match.lon}-${match.displayName}`} onClick={() => choosePlace(match)}><b>{match.displayName}</b><small>{match.lat.toFixed(6)}, {match.lon.toFixed(6)}</small></button>)}
      </div> : null}

      <fieldset className="lab-hazard-picker">
        <legend>Co agenci mają badać?</legend>
        {HAZARD_TYPES.map(hazard => <label key={hazard} className={form.hazards.includes(hazard) ? 'selected' : ''}>
          <input type="checkbox" checked={form.hazards.includes(hazard)} onChange={() => toggleHazard(hazard)} />
          <span><b>{HAZARD_LABELS[hazard]}</b><small>{hazard}</small></span>
        </label>)}
      </fieldset>

      <div className="lab-mode-grid">
        <fieldset>
          <legend>Poziom analizy Terra</legend>
          <label><input type="radio" name="depth" checked={form.depth === 'screening'} onChange={() => setForm(current => ({ ...current, depth: 'screening' }))} /> Łatwy · szybki screening</label>
          <label><input type="radio" name="depth" checked={form.depth === 'deep'} onChange={() => setForm(current => ({ ...current, depth: 'deep' }))} /> Trudny · głębokie dochodzenie</label>
        </fieldset>
        <fieldset>
          <legend>Galeria wieloletnia</legend>
          <label><input type="radio" name="timeline" checked={form.timelineMode === 'representative'} onChange={() => setForm(current => ({ ...current, timelineMode: 'representative' }))} /> Reprezentatywne lata (maks. 12)</label>
          <label><input type="radio" name="timeline" checked={form.timelineMode === 'annual'} onChange={() => setForm(current => ({ ...current, timelineMode: 'annual' }))} /> Każdy rok w zadanym okresie</label>
        </fieldset>
        <fieldset>
          <legend>Sposób oglądania obszaru</legend>
          <label><input type="radio" name="spatial" checked={form.spatialMode === 'overview'} onChange={() => setForm(current => ({ ...current, spatialMode: 'overview' }))} /> Widok ogólny · kilka dat całego AOI</label>
          <label><input type="radio" name="spatial" checked={form.spatialMode === 'regional-patrol'} onChange={() => setForm(current => ({ ...current, spatialMode: 'regional-patrol', depth: 'deep' }))} /> Patrol regionalny · 20 zbliżeń 1×1 km + widok ogólny</label>
          <button type="button" onClick={() => setForm(current => ({ ...current, radiusKm: '20', spatialMode: 'regional-patrol', depth: 'deep' }))}>Ustaw wariant: promień 20 km + 20 kadrów 1 km</button>
          {form.spatialMode === 'regional-patrol' ? <small><b>Uczciwe pokrycie:</b> dla promienia {Number.isFinite(configuredRadiusKm) ? configuredRadiusKm : '—'} km te 20 kadrów obejmie najwyżej około {configuredPatrolCoveragePercent.toFixed(2)}% powierzchni. To przesiew próbek, nie pełna mapa.</small> : null}
        </fieldset>
      </div>

      <div className="toolbar lab-run-toolbar">
        <button type="button" className="lab-primary" onClick={run} disabled={running}>{running ? 'Agenci pobierają i weryfikują prawdziwe źródła…' : researchSeriesCount < 10 ? `Uruchom przebieg ${nextSeriesRun}/10` : 'Uruchom kolejny przebieg'}</button>
        <button type="button" onClick={exportJson} disabled={!result}>Eksportuj pełny JSON</button>
      </div>
      <p className="lab-note"><b>Seria tej samej konfiguracji:</b> {researchSeriesCount}/10 faktycznie zapisanych, unikalnych przebiegów w tej przeglądarce. Licznik nie zalicza testów kodu ani niezapisanych prób.</p>
      {running ? <p className="lab-progress" role="status">Trwa połączenie z Terra Worker, NASA/USGS/Copernicus, DEM i bazami analogii.{form.spatialMode === 'regional-patrol' ? ' Worker dodatkowo pobiera i sprawdza 20 zbliżeń 1 km w czterech bezpiecznych strumieniach.' : ''} Nie wyświetlamy symulowanych wyników — raport pojawi się dopiero po odpowiedzi źródeł.</p> : null}
      {error ? <p className="lab-error" role="alert"><b>NIE UDAŁO SIĘ ZAKOŃCZYĆ PRZEBIEGU:</b> {error}</p> : null}
    </section>

    {!result && !running ? <section className="card lab-empty">
      <h2>Co zrobi przebieg?</h2>
      <ol>
        <li>Potwierdzi AOI i okres, a potem pobierze obrazy i metadane z oficjalnych/publicznych źródeł.</li>
        <li>Pokaże oddzielnie obrazy faktycznie obejrzane przez model oraz lata tylko skatalogowane.</li>
        <li>Zbuduje konkurencyjne hipotezy przyczyn, wymagane pomiary terenowe i analogie z innych regionów.</li>
        <li>Jeśli bramka dowodowa na to pozwoli, przygotuje niewysłany szkic wstępnego alertu.</li>
        <li>Zaproponuje warunkowe działania techniczne z wymaganym projektem, pozwoleniem i decyzją człowieka.</li>
      </ol>
    </section> : null}

    {result ? <>
      <section className="card lab-conclusion">
        <div className="lab-section-title"><div><p className="eyebrow">WYNIK PRZEBIEGU</p><h2>{result.area.resolvedName}</h2></div><div className="lab-status-stack"><StatusBadge value={result.classification} /><StatusBadge value={sourceState(result.signalState)} /><StatusBadge value={result.verification.state} /></div></div>
        <div className="lab-metrics">
          <article><b>{result.imagery.visuallyInspectedByModel}</b><span>obrazy obejrzane przez model</span></article>
          <article><b>{result.imagery.slots.filter(item => item.status === 'image').length}/{result.imagery.requestedYears.length}</b><span>lata z obrazem w galerii</span></article>
          <article><b>{result.imagery.analysis?.landsat_catalog.matched ?? '—'}</b><span>sceny dopasowane w katalogu Landsat</span></article>
          <article><b>{result.analogues?.selectedCases.length ?? 0}</b><span>analogie regionalne (tylko kontekst)</span></article>
        </div>
        <p className="lab-note"><b>Najważniejsza granica:</b> {result.imagery.warning}</p>
        <p><b>AOI:</b> {result.area.latitude.toFixed(6)}, {result.area.longitude.toFixed(6)} · promień {result.area.radiusKm} km · {result.period.startYear}–{result.period.endYear} · sezon: {result.period.season}.</p>
        <div className="toolbar lab-result-toolbar">
          <button type="button" className="lab-primary" onClick={saveResearch}>Zapisz ponownie</button>
          <button type="button" onClick={() => setShowExtended(value => !value)}>{showExtended ? 'Ukryj opis rozszerzony' : 'Pokaż opis rozszerzony'}</button>
          <button type="button" onClick={() => setShowImagery(value => !value)}>{showImagery ? 'Ukryj zdjęcia' : `Pokaż zdjęcia (${availableImageCount})`}</button>
          <Link className="button-link" to="/research-archive">Archiwum badań ({archiveCount})</Link>
        </div>
        {archiveStatus ? <p className="lab-place-status" role="status" aria-live="polite">{archiveStatus}</p> : null}
      </section>

      <section className="card lab-authenticity-audit" aria-label="Kontrola pochodzenia obrazów">
        <div className="lab-section-title"><div><p className="eyebrow">BRAMKA POCHODZENIA OBRAZÓW</p><h2>Tylko oryginalne produkty satelitarne trafiają do modelu</h2></div><StatusBadge value={imageryAuthenticityPolicy ? 'ORIGINAL ONLY' : 'RERUN REQUIRED'} /></div>
        <div className="lab-metrics">
          <article><b>{imageryAuthenticityPolicy?.original_model_input_count ?? 0}</b><span>oryginalnych oficjalnych wejść satelitarnych</span></article>
          <article><b>{imageryAuthenticityPolicy?.derived_model_input_count ?? '—'}</b><span>produktów pochodnych przekazanych modelowi</span></article>
          <article><b>{imageryAuthenticityPolicy?.ai_generated_model_input_count ?? '—'}</b><span>obrazów AI przekazanych modelowi</span></article>
          <article><b>{derivedDisplayImages.length}</b><span>produktów pochodnych tylko do kontroli człowieka</span></article>
        </div>
        <p className="lab-note">{imageryAuthenticityPolicy
          ? <><b>Zasada spełniona:</b> model otrzymał wyłącznie jawnie oznaczone, oficjalne produkty satelitarne. Nakładki, maski i klasyfikacje pozostają poza wejściem modelu. W tym przebiegu nie ma obrazów wygenerowanych przez AI.</>
          : <><b>Brak nowego protokołu pochodzenia:</b> ten zapis pochodzi ze starszej wersji Workera. Nie uznajemy jego obrazów za potwierdzone oryginały — uruchom badanie ponownie.</>}</p>
        {rejectedModelPreviewImages.length ? <p className="lab-error"><b>Odrzucono {rejectedModelPreviewImages.length} {rejectedModelPreviewImages.length === 1 ? 'obraz' : 'obrazów'} z sekcji wejść modelu</b>, ponieważ nie miały jawnej klasy oryginału albo były produktem pochodnym.</p> : null}
      </section>

      {regionalPatrol ? <section className="card lab-regional-patrol" aria-label="Patrol regionalny zbliżeń satelitarnych">
        <div className="lab-section-title"><div><p className="eyebrow">PATROL REGIONALNY · ZBLIŻENIA 1 KM</p><h2>Co naprawdę obejrzał agent</h2></div><StatusBadge value={sourceState(regionalPatrol.status)} /></div>
        <div className="lab-metrics">
          <article><b>{regionalPatrol.inspected_tiles}/{regionalPatrol.requested_tiles}</b><span>zbliżeń obejrzanych przez model</span></article>
          <article><b>{regionalPatrol.frame_width_km.toFixed(1)} × {regionalPatrol.frame_width_km.toFixed(1)} km</b><span>wielkość jednego kadru</span></article>
          <article><b>≤ {regionalPatrol.nominal_coverage_upper_bound_percent.toFixed(2)}%</b><span>górna granica pokrycia AOI</span></article>
          <article><b>{regionalPatrol.nominal_resolution_m ? `~${regionalPatrol.nominal_resolution_m} m` : 'nie ustalono'}</b><span>natywna rozdzielczość źródła</span></article>
        </div>
        <p><b>Źródło:</b> {regionalPatrol.source ?? 'brak porównywalnego HLS'} · data {regionalPatrol.source_date ?? 'nieustalona'}.</p>
        <p className="lab-note"><b>Wniosek uczciwy:</b> to {regionalPatrol.inspected_tiles} przestrzennych próbek z jednej daty. Co najmniej {regionalPatrol.uninspected_area_lower_bound_percent.toFixed(2)}% AOI pozostaje poza tymi kadrami, więc brak kandydata w patrolu nie oznacza braku zagrożenia w całym regionie. Zbliżenie nie tworzy nowych szczegółów ponad rozdzielczość sensora.</p>
        {regionalPatrolAssessment && regionalPatrolAssessment.status !== 'NOT_REQUESTED' ? <div className="lab-patrol-assessment">
          <h3>Wynik przeglądu kadr po kolei</h3>
          <p>{regionalPatrolAssessment.overview}</p>
          <div className="lab-metrics">
            <article><b>{regionalPatrolAssessment.tile_findings.length}</b><span>kadrów ze strukturalnym opisem</span></article>
            <article><b>{regionalPatrolAssessment.tiles_with_visible_open_water.length}</b><span>kadry z widoczną otwartą wodą</span></article>
            <article><b>{regionalPatrolAssessment.tiles_with_possible_channel.length}</b><span>kadry z możliwym ciekiem</span></article>
            <article><b>{regionalPatrolAssessment.tiles_with_cloud_shadow_or_no_data.length}</b><span>kadry zasłonięte lub bez danych</span></article>
          </div>
          <details><summary>Szczegółowe opisy kadrów P01–P20</summary>
            <div className="table-wrap"><table><thead><tr><th>Kadr</th><th>Powierzchnia</th><th>Hydrologia</th><th>Obserwacja</th><th>Pewność</th></tr></thead><tbody>
              {regionalPatrolAssessment.tile_findings.map(finding => <tr key={finding.tile_id}><td><b>{finding.tile_id}</b></td><td>{sourceState(finding.surface_class)}</td><td>{sourceState(finding.hydrology_feature)}</td><td>{finding.observation}</td><td>{finding.confidence}</td></tr>)}
            </tbody></table></div>
          </details>
        </div> : null}
        <details><summary>Manifest 20 kadrów i współrzędne kontroli</summary>
          <div className="table-wrap"><table><thead><tr><th>Kadr</th><th>Środek WGS84</th><th>Status</th></tr></thead><tbody>
            {regionalPatrol.tile_manifest.map(tile => <tr key={tile.tile_id}><td><b>{tile.tile_id}</b></td><td>{tile.latitude.toFixed(6)}, {tile.longitude.toFixed(6)}</td><td><StatusBadge value={sourceState(tile.status)} /></td></tr>)}
          </tbody></table></div>
        </details>
      </section> : null}

      {test001Record ? <section className="card lab-test001-focus" aria-label="Dowód 500 m dla TEST 001">
        <div className="lab-section-title"><div><p className="eyebrow">TEST 001 · TEN SAM STAW · ORYGINALNE ŹRÓDŁA</p><h2>Silnie wspierany zanik historycznego lustra wody</h2></div><div className="lab-status-stack"><StatusBadge value="HIGH PRIORITY ANOMALY" /><StatusBadge value="CAUSE UNKNOWN" /></div></div>
        <p className="lab-finding-lead"><b>Powtarzalna seria oryginalnych obrazów satelitarnych z lat 1990–2026 silnie wspiera niemal całkowity zanik historycznego trwałego lustra tego stawu.</b> Dwa pliki poniżej są oryginalnymi, przypiętymi źródłami satelitarnymi obejmującymi ten sam obszar wokół punktu {test001Record.correctedPondSeed.lat.toFixed(6)}, {test001Record.correctedPondSeed.lon.toFixed(6)}. Nie zawierają obrysu, maski ani obrazu AI.</p>
        <div className="lab-metrics">
          <article><b>{test001Record.mostVisibleHistoricalYear}</b><span>najwięcej w zmierzonych latach historycznych · {test001Record.mostVisibleHistoricalAreaHa.toFixed(2)} ha</span></article>
          <article><b>{test001Record.leastVisibleEndpointYear}</b><span>najmniej widocznej wody · brak porównywalnego trwałego lustra</span></article>
          <article><b>≈ {test001Record.approximateDisappearedHistoricalFootprintHa.toFixed(2)} ha</b><span>szacowany zanik historycznego trwałego obrysu</span></article>
          <article><b>{(test001Record.overlap1990WithCentralConsensusPercent).toFixed(1)}%</b><span>pokrycie obrysu 1990 z wieloletnim wzorcem</span></article>
        </div>
        <div className="lab-imagery-grid lab-fixed-crop-grid">
          {test001ComparisonImages.map(image => {
            const imageKey = `test001-original-${image.year}`
            const alt = image.year === 2000 ? 'Oryginalny obraz satelitarny Landsat-5 obszaru stawu TEST 001 z 2000 roku' : 'Oryginalny obraz satelitarny Sentinel-2B obszaru stawu TEST 001 z 2026 roku'
            return <figure key={image.year}>
              {failedImages[imageKey]
                ? <div className="lab-image-fallback" role="status"><span>Nie udało się pobrać obrazu dowodowego.</span><a href={image.url} target="_blank" rel="noreferrer">Otwórz źródło ↗</a></div>
                : <a className="lab-image-link" href={image.url} target="_blank" rel="noreferrer"><img src={image.url} style={displayFilterStyle} loading="eager" decoding="async" alt={alt} onLoad={event => recordImageLoad(imageKey, event.currentTarget)} onError={() => recordImageFailure(imageKey)} /></a>}
              <figcaption><StatusBadge value={imageOriginLabel({ image_authenticity: image.imageAuthenticity, ai_generated: image.aiGenerated })} /><b>{image.year}</b><span>{image.year === 2000 ? 'oryginalny Landsat‑5 · 30 m' : 'oryginalny Sentinel‑2B · 10 m'}</span><small>pełny przypięty kadr źródłowy 2 km · bez nakładki, maski i generowania AI · {imageDimensions[imageKey] ?? 'sprawdzanie obrazu'}</small></figcaption>
            </figure>
          })}
        </div>
        <p><b>Wielkość zmiany:</b> centralny historyczny obrys {test001Record.historicalPersistentFootprintHa.toFixed(2)} ha; zakres wspierany przez powtarzalne obrazy {(test001Record.repeatSupportedRangeM2[0] / 10_000).toFixed(2)}–{(test001Record.repeatSupportedRangeM2[1] / 10_000).toFixed(2)} ha. W 2026 nie widać porównywalnego trwałego ciemnego lustra.</p>
        <p className="lab-note"><b>Granica prawdy:</b> dokładna resztkowa powierzchnia wody w 2026 i dokładny procent utraty pozostają nieustalone; korony drzew, cień, mokra gleba i piksele mieszane uniemożliwiają uczciwe wpisanie „0 m²” lub „100%”. Przyczyna wyschnięcia także nie jest jeszcze ustalona.</p>
        <details><summary>Pokaż pochodne nakładki pomiarowe — nie są oryginalnymi zdjęciami</summary>
          <p className="lab-note"><b>PRODUKT POCHODNY, NIE AI:</b> czerwony obrys jest wynikiem pomiaru konsensusowego wykonanego na oryginalnej serii. Te pliki służą człowiekowi do kontroli metody i nie zostały przekazane modelowi jako zdjęcia.</p>
          <div className="lab-imagery-grid lab-fixed-crop-grid">
            {test001DerivedComparisonImages.map(image => {
              const imageKey = `test001-derived-${image.year}`
              return <figure key={imageKey}>
                {failedImages[imageKey]
                  ? <div className="lab-image-fallback" role="status"><span>Nie udało się pobrać produktu pochodnego.</span><a href={image.url} target="_blank" rel="noreferrer">Otwórz plik pochodny ↗</a></div>
                  : <a className="lab-image-link" href={image.url} target="_blank" rel="noreferrer"><img src={image.url} style={displayFilterStyle} loading="lazy" decoding="async" alt={`Pochodna nakładka pomiarowa TEST 001 z ${image.year} roku — nie jest oryginalnym zdjęciem`} onLoad={event => recordImageLoad(imageKey, event.currentTarget)} onError={() => recordImageFailure(imageKey)} /></a>}
                <figcaption><StatusBadge value={imageOriginLabel({ image_authenticity: image.imageAuthenticity, ai_generated: image.aiGenerated })} /><b>{image.year}</b><span>czerwona linia = historyczny obrys konsensusowy</span><small>stały kadr ~{test001Record.evidenceCropWidthM.toFixed(0)} m · produkt kontroli pomiaru · wejście modelu: NIE</small></figcaption>
              </figure>
            })}
          </div>
        </details>
        <details><summary>Dostosuj jasność, kontrast i barwy podglądu</summary><ImageryControls value={imageryDisplay} onChange={setImageryDisplay} /></details>
      </section> : null}

      {waterExtrema && !test001Record ? <section className="card lab-water-extrema" aria-label="Ranking lat widocznej wody">
        <div className="lab-section-title"><div><p className="eyebrow">TP26 · PORÓWNANIE WIELOLETNIE</p><h2>Rok maksimum i minimum widocznej wody</h2></div><StatusBadge value={waterExtrema.status === 'ESTABLISHED' ? 'COMPARABLE YEARS' : 'INSUFFICIENT DATA'} /></div>
        <div className="lab-metrics lab-water-extrema-metrics">
          <article><b>{waterExtrema.status === 'ESTABLISHED' ? waterExtrema.most_visible_water_year : 'nie ustalono'}</b><span>najwięcej widocznej wody</span></article>
          <article><b>{waterExtrema.status === 'ESTABLISHED' ? waterExtrema.least_visible_water_year : 'nie ustalono'}</b><span>najmniej widocznej wody</span></article>
          <article><b>{waterExtrema.compared_years.length}</b><span>lat dopuszczonych do rankingu</span></article>
        </div>
        <p>{compactReportText(waterExtrema.basis, 560)}</p>
        <p className="lab-note">To ranking względnej widocznej powierzchni wody spośród porównywalnych scen, nie pomiar objętości ani dowód przyczyny. Karty katalogowe i słabe obrazy nie są liczone.</p>
      </section> : null}

      <section className="card lab-compact-summary">
        <div className="lab-section-title"><div><p className="eyebrow">SKRÓT BADANIA</p><h2>Najważniejsze wnioski i hipotezy</h2></div><StatusBadge value="FIELD CHECK REQUIRED" /></div>
        <div className="grid two">
          <article><h3>Co wynika z materiału</h3><ul>
            {(result.imagery.analysis ? [result.imagery.analysis.analysis.headline, result.imagery.analysis.analysis.change_over_time, result.imagery.analysis.analysis.water_assessment] : result.observations.slice(0, 3).map(item => item.statement)).map(item => <li key={item}>{compactReportText(item)}</li>)}
          </ul></article>
          {result.imagery.analysis?.analysis.hydrology_screening ? <article><h3>Dopływy, odpływy i ubytek wody</h3>
            <p><b>Zmiana wody:</b> {result.imagery.analysis.analysis.hydrology_screening.water_change_state}</p>
            <p><b>Sieć wodna:</b> {result.imagery.analysis.analysis.hydrology_screening.inflow_outflow_status}</p>
            <p><b>Przyczyna:</b> nieustalona — wymaga pomiarów i kontroli terenowej.</p>
          </article> : null}
          <article><h3>Hipotezy do sprawdzenia</h3><ul>{result.hypotheses.slice(0, 3).map(item => <li key={item.id}><b>{HAZARD_LABELS[item.hazardType]}:</b> {item.hypothesis}</li>)}</ul></article>
        </div>
        <p><b>Weryfikacja:</b> {result.verification.reason}</p>
        {result.imagery.analysis?.analysis_protocol ? <p className="lab-note"><b>L4 #3/#4:</b> protokół porównań i audytu; checkpoint L4 nie jest załadowany w Workerze i trening nie jest prawdą terenową.</p> : null}
        {result.imagery.analysis ? <p><b>Następny krok:</b> {compactReportText(result.imagery.analysis.analysis.recommended_next_step)}</p> : null}
      </section>

      <section className="card lab-honest-audit">
        <div className="lab-section-title"><div><p className="eyebrow">UCZCIWY AUDYT RAPORTU</p><h2>Czego ten przebieg nadal nie zrobił</h2></div><StatusBadge value="OPEN GAPS" /></div>
        <ul>
          <li>Nie policzył powierzchni wody w km²/ha dla każdej porównywalnej daty; obecny ranking jest jakościowy.</li>
          <li>Nie pobrał jeszcze Sentinel‑1 SAR, więc chmury, cień i mokra roślinność nadal mogą mylić obraz optyczny.</li>
          <li>Nie nałożył urzędowej sieci hydrograficznej, dlatego widoczne dopływy, odpływy i zatory pozostają kandydatami, a nie potwierdzoną siecią przepływu.</li>
          <li>Nie połączył szeregu opadu, parowania, poziomu wód gruntowych, wodowskazów i poboru wody — bez tego nie da się uczciwie ustalić przyczyny.</li>
          {regionalPatrol ? <li>Patrol zbliżeń nie jest pełnym pokryciem i używa jednej daty; kolejny etap powinien porównać te same podejrzane kadry w co najmniej dwóch zgodnych sezonowo latach.</li> : <li>Nie wykonano przestrzennego patrolu zbliżeń; dalekie kadry mogą przeoczyć małe cieki, rowy i zbiorniki.</li>}
          <li>Nie przeprowadzono kontroli terenowej ani pomiaru przepływu powyżej i poniżej podejrzanych miejsc.</li>
        </ul>
      </section>

      {showExtended ? <>
      <section className="card">
        <h2>Agenci i faktycznie wykonane narzędzia</h2>
        <div className="lab-agent-grid">
          {result.agents.map(agent => <article key={`${agent.name}-${agent.tool}`}><StatusBadge value={agent.status} /><h3>{agent.name}</h3><p>{agent.role}</p><small><b>{agent.tool}</b><br />{agent.result}</small></article>)}
        </div>
      </section>

      <section className="card">
        <h2>Status źródeł</h2>
        <div className="table-wrap"><table><thead><tr><th>Źródło</th><th>Status</th><th>Rola i wynik</th><th>Link</th></tr></thead><tbody>
          {result.sourceStatus.map(item => <tr key={item.id}><td><b>{item.name}</b><br /><small>{item.provider}</small></td><td><StatusBadge value={item.state} /></td><td>{item.role}<br /><small>{item.detail}</small></td><td><a href={item.sourceUrl} target="_blank" rel="noreferrer">Otwórz ↗</a></td></tr>)}
        </tbody></table></div>
      </section>
      </> : null}

      {showExtended && result.imagery.analysis ? <section className="card">
        <div className="lab-section-title"><div><p className="eyebrow">ANALIZA WIZUALNA REPREZENTATYWNYCH SCEN</p><h2>{result.imagery.analysis.analysis.headline}</h2></div><StatusBadge value={`MODEL ${result.imagery.analysis.analysis.confidence.level}`} /></div>
        <div className="grid two">
          <article><h3>Co widać</h3><p>{result.imagery.analysis.analysis.what_is_visible}</p></article>
          <article><h3>Zmiana w czasie</h3><p>{result.imagery.analysis.analysis.change_over_time}</p></article>
          <article><h3>Ocena widocznej wody</h3><p>{result.imagery.analysis.analysis.water_assessment}</p></article>
          {result.imagery.analysis.analysis.hydrology_screening ? <article><h3>Sieć główna i dopływy boczne</h3><p>{result.imagery.analysis.analysis.hydrology_screening.main_and_tributary_context}</p><ul>{result.imagery.analysis.analysis.hydrology_screening.candidate_features.map(item => <li key={item}>{item}</li>)}</ul></article> : null}
          <article><h3>Jakościowa ocena modelu — niekalibrowana</h3><p>{result.imagery.analysis.analysis.confidence.reason}</p></article>
        </div>
        <p><b>Następny krok wskazany przez analizę:</b> {result.imagery.analysis.analysis.recommended_next_step}</p>
        <ul>{result.imagery.analysis.analysis.limitations.map(item => <li key={item}>{item}</li>)}</ul>
        {result.imagery.analysis.tp26_protocol ? <details><summary>TP26 — źródła i bramka jakości zdjęć</summary>
          <p>{result.imagery.analysis.tp26_protocol.extrema_gate}</p>
          <ul>{result.imagery.analysis.tp26_protocol.source_ladder.map(item => <li key={item.source}><b>{item.source}</b> · {item.nominal_resolution} — {item.role}{item.runtime_state ? <><br /><small>{sourceState(item.runtime_state)}</small></> : null}</li>)}</ul>
          {result.imagery.analysis.water_extrema_readiness ? <p><b>Ten przebieg:</b> {result.imagery.analysis.water_extrema_readiness.high_resolution_aoi_images} obrazów AOI z {result.imagery.analysis.water_extrema_readiness.high_resolution_aoi_years ?? 'nieustalonej liczby'} porównywalnych lat; łącznie {result.imagery.analysis.water_extrema_readiness.visually_supplied_images} wejść wizualnych.</p> : null}
        </details> : null}
      </section> : null}

      {showImagery ? <>
      <section className="card lab-media-section">
        <ImageryControls value={imageryDisplay} onChange={setImageryDisplay} />
      </section>

      {overviewPreviewImages.length ? <section className="card lab-model-inputs lab-media-section">
        <div className="lab-section-title"><div><p className="eyebrow">ORYGINALNE WEJŚCIA ANALIZY · NIE AI</p><h2>Oficjalne produkty satelitarne obejrzane przez model</h2></div><StatusBadge value={`${overviewPreviewImages.length} INSPECTED`} /></div>
        <p className="lab-note">Każda karta ma jawną klasę oryginału. Może to być pojedyncza akwizycja albo oficjalny kompozyt miesięczny — rodzaj produktu jest podany osobno. Suwaki zmieniają tylko Twój podgląd.</p>
        <div className="lab-imagery-grid lab-model-imagery">
          {overviewPreviewImages.map((image, index) => {
            const imageKey = `model-${image.date}-${index}`
            return <figure key={imageKey}>
              {failedImages[imageKey]
                ? <div className="lab-image-fallback" role="status"><span>Nie udało się pobrać lekkiego podglądu.</span><a href={image.url} target="_blank" rel="noreferrer">Otwórz źródło ↗</a></div>
                : <a className="lab-image-link" href={image.url} target="_blank" rel="noreferrer"><img src={mobilePreviewUrl(image.url)} style={displayFilterStyle} loading="lazy" decoding="async" alt={`Obraz wejściowy modelu ${image.date}`} onLoad={event => recordImageLoad(imageKey, event.currentTarget)} onError={() => recordImageFailure(imageKey)} /></a>}
              <figcaption><StatusBadge value={imageOriginLabel(image)} /><b>{image.date}</b><span>{image.source}</span><small>{image.product_kind ?? image.evidence_role ?? 'TEMPORAL_CONTEXT'} · {image.nominal_resolution_m ? `${image.nominal_resolution_m} m` : 'rozdzielczość zależna od źródła'} · lekki podgląd {imageDimensions[imageKey] ?? 'sprawdzany'}</small><small>chmury w metadanych: {cloudCoverLabel(image.cloud_cover ?? null)} · kliknij, aby otworzyć oryginalne źródło</small></figcaption>
            </figure>
          })}
        </div>
      </section> : null}

      {patrolPreviewImages.length ? showPatrolImagery ? <section className="card lab-model-inputs lab-media-section">
        <div className="lab-section-title"><div><p className="eyebrow">PATROL REGIONALNY · ORYGINALNE WEJŚCIA · NIE AI</p><h2>Zbliżenia faktycznie obejrzane przez model</h2></div><StatusBadge value={`${patrolPreviewImages.length} INSPECTED`} /></div>
        <p className="lab-note">Każdy kadr ma 1 km szerokości, ale natywna rozdzielczość HLS pozostaje około 30 m. Obrazy są ładowane osobno, aby telefon nie wygasił strony.</p>
        <div className="lab-imagery-grid lab-model-imagery">
          {patrolPreviewImages.map((image, index) => {
            const imageKey = `patrol-${image.patrol_tile_id ?? index}-${image.date}`
            return <figure key={imageKey}>
              {failedImages[imageKey]
                ? <div className="lab-image-fallback" role="status"><span>Nie udało się pobrać lekkiego podglądu.</span><a href={image.url} target="_blank" rel="noreferrer">Otwórz źródło ↗</a></div>
                : <a className="lab-image-link" href={image.url} target="_blank" rel="noreferrer"><img src={mobilePreviewUrl(image.url)} style={displayFilterStyle} loading="lazy" decoding="async" alt={`Kadr patrolu ${image.patrol_tile_id ?? index + 1} z ${image.date}`} onLoad={event => recordImageLoad(imageKey, event.currentTarget)} onError={() => recordImageFailure(imageKey)} /></a>}
              <figcaption><StatusBadge value={imageOriginLabel(image)} /><b>{image.patrol_tile_id ?? `Kadr ${index + 1}`} · {image.date}</b><span>{image.source}</span><small>środek: {typeof image.tile_center_latitude === 'number' ? image.tile_center_latitude.toFixed(6) : '—'}, {typeof image.tile_center_longitude === 'number' ? image.tile_center_longitude.toFixed(6) : '—'} · kadr {image.tile_frame_width_km ?? 1} km · źródło {image.nominal_resolution_m ?? '—'} m</small></figcaption>
            </figure>
          })}
        </div>
      </section> : <section className="card lab-media-gate">
        <div><p className="eyebrow">20 ZBLIŻEŃ PATROLU</p><h2>Podglądy nadal wstrzymane dla telefonu</h2><p>Agent już je przeanalizował. Załaduj je tylko wtedy, gdy chcesz ręcznie sprawdzić wszystkie kadry.</p></div>
        <button type="button" className="lab-primary" onClick={() => setShowPatrolImagery(true)}>Załaduj {patrolPreviewImages.length} zbliżeń</button>
      </section> : null}

      {additionalDerivedDisplayImages.length ? <section className="card lab-derived-products lab-media-section">
        <div className="lab-section-title"><div><p className="eyebrow">PRODUKTY POCHODNE · POZA WEJŚCIEM MODELU</p><h2>Klasyfikacje i nakładki tylko do kontroli człowieka</h2></div><StatusBadge value={`${additionalDerivedDisplayImages.length} DISPLAY ONLY`} /></div>
        <p className="lab-note">To nie są oryginalne zdjęcia i nie są obrazami wygenerowanymi przez AI. Powstały przez klasyfikację lub nałożenie wyniku pomiaru na dane satelitarne. System nie użył ich jako wejść wizualnych modelu.</p>
        <div className="lab-imagery-grid">
          {additionalDerivedDisplayImages.map((image, index) => {
            const imageKey = `derived-${image.date}-${index}`
            return <figure key={imageKey}>
              {failedImages[imageKey]
                ? <div className="lab-image-fallback" role="status"><span>Produkt pochodny niedostępny.</span><a href={image.url} target="_blank" rel="noreferrer">Otwórz plik ↗</a></div>
                : <a className="lab-image-link" href={image.url} target="_blank" rel="noreferrer"><img src={mobilePreviewUrl(image.url)} style={displayFilterStyle} loading="lazy" decoding="async" alt={`Produkt pochodny ${image.source} z ${image.date} — nieoryginalny i niewygenerowany przez AI`} onLoad={event => recordImageLoad(imageKey, event.currentTarget)} onError={() => recordImageFailure(imageKey)} /></a>}
              <figcaption><StatusBadge value={imageOriginLabel(image)} /><b>{image.date}</b><span>{image.source}</span><small>{image.product_kind ?? image.evidence_role ?? 'DERIVED'} · wejście modelu: NIE</small></figcaption>
            </figure>
          })}
        </div>
      </section> : null}

      {generatedDisplayImages.length ? <section className="card lab-generated-products lab-media-section">
        <div className="lab-section-title"><div><p className="eyebrow">MATERIAŁ WYGENEROWANY · NIE DOWÓD</p><h2>Obrazy AI wyłączone z analizy satelitarnej</h2></div><StatusBadge value={`${generatedDisplayImages.length} GENERATED`} /></div>
        <p className="lab-error"><b>Te obrazy są wygenerowane, nie są oryginalnymi zdjęciami satelitarnymi i nie zostały przekazane modelowi jako dowód.</b></p>
        <div className="lab-imagery-grid">
          {generatedDisplayImages.map((image, index) => <figure key={`generated-${image.date}-${index}`}>
            <a className="lab-image-link" href={image.url} target="_blank" rel="noreferrer"><img src={image.url} loading="lazy" decoding="async" alt={`Obraz wygenerowany przez AI z etykietą ${image.date} — nie jest dowodem satelitarnym`} /></a>
            <figcaption><StatusBadge value={imageOriginLabel(image)} /><b>{image.date}</b><span>{image.source}</span><small>wejście modelu dowodowego: NIE</small></figcaption>
          </figure>)}
        </div>
      </section> : null}

      <section className="card lab-media-section">
        <div className="lab-section-title"><div><p className="eyebrow">MATERIAŁ KATALOGOWY</p><h2>Roczna galeria porównawcza</h2></div><StatusBadge value={`${result.imagery.missingYears} MISSING`} /></div>
        <p className="lab-note">Oddzielona od wejść modelu. Każdy zwrócony plik musi mieć etykietę pochodzenia. Landsat może być miniaturą całej sceny, nawet 300×300 — wtedy służy tylko do wyboru źródła, a nie rozpoznawania małego stawu.</p>
        <div className="lab-imagery-grid">
          {result.imagery.slots.map(slot => {
            if (slot.status !== 'image' || !slot.image) return <article className="lab-missing-year" key={slot.year}><b>{slot.year}</b><span>BRAK OBRAZU</span><small>{slot.reason ?? 'Źródło nie zwróciło obrazu dla tego roku.'}</small></article>
            const imageKey = `gallery-${slot.year}`
            const sourceUrl = slot.image.original_url || slot.image.url
            const originalDeclared = isExplicitOriginalSatelliteImage(slot.image)
            return <figure key={slot.year}>
              {failedImages[imageKey]
                ? <div className="lab-image-fallback" role="status"><span>Podgląd niedostępny — pozostała karta źródłowa.</span><a href={sourceUrl} target="_blank" rel="noreferrer">Otwórz źródło ↗</a></div>
                : <a className="lab-image-link" href={sourceUrl} target="_blank" rel="noreferrer"><img src={mobilePreviewUrl(slot.image.url)} style={displayFilterStyle} loading="lazy" decoding="async" alt={`Obraz satelitarny dla roku ${slot.year}`} onLoad={event => recordImageLoad(imageKey, event.currentTarget)} onError={() => recordImageFailure(imageKey)} /></a>}
              <figcaption><StatusBadge value={imageOriginLabel(slot.image)} /><b>{slot.year} · {slot.image.date}</b><span>{slot.image.source}</span><small>{slot.image.product_kind ?? slot.image.render_kind ?? 'CATALOGUE BROWSE'} · {slot.image.aoi_cropped === true ? 'wycinek AOI' : 'cała scena / status AOI niepotwierdzony'} · lekki podgląd {failedImages[imageKey] ? 'niedostępny' : imageDimensions[imageKey] ?? 'sprawdzany'}</small><small>chmury: {cloudCoverLabel(slot.image.cloud_cover)} · {slot.image.scene_id ?? 'fallback bez ID sceny'} · {originalDeclared ? 'oryginalny produkt oficjalnego dostawcy' : 'pochodzenie wymaga ponownego przebiegu'}</small></figcaption>
            </figure>
          })}
        </div>
      </section>
      </> : <section className="card lab-media-gate">
        <div><p className="eyebrow">ZDJĘCIA SATELITARNE</p><h2>Galeria wstrzymana dla stabilności telefonu</h2><p>Raport tekstowy i zapis archiwum są już dostępne. {availableImageCount} podglądów załaduje się dopiero po Twoim kliknięciu, aby Android nie wygasił całej strony.</p></div>
        <button type="button" className="lab-primary" onClick={() => setShowImagery(true)}>Załaduj lekkie podglądy zdjęć</button>
      </section>}

      {showExtended ? <>
      <section className="card">
        <h2>Obserwacje, anomalie i kontekst — bez mieszania klas dowodu</h2>
        <div className="lab-evidence-list">
          {result.observations.map((item, index) => <article key={`${item.evidenceClass}-${index}`}><StatusBadge value={item.evidenceClass} /><p>{item.statement}</p><small><b>{item.source}</b><br />{item.limitation}</small></article>)}
        </div>
        {result.screeningSignals.length ? <><h3>Sygnały wykryte w tekście analizy</h3><ul>{result.screeningSignals.map(item => <li key={`${item.hazardType}-${item.matchedText}`}><b>{HAZARD_LABELS[item.hazardType]}:</b> {item.matchedText} <small>— kandydat przesiewowy, nie dowód przyczyny</small></li>)}</ul></> : <p>Automatyczne przesiewanie tekstu nie ustanowiło anomalii dla wybranych klas. Nie dowodzi to braku zagrożenia.</p>}
      </section>

      <section className="card">
        <h2>Konkurencyjne hipotezy przyczyn</h2>
        <div className="table-wrap"><table><thead><tr><th>ID</th><th>Hipoteza</th><th>Status</th><th>Co ją sprawdzi</th></tr></thead><tbody>
          {result.hypotheses.map(item => <tr key={item.id}><td>{item.id}<br /><small>{HAZARD_LABELS[item.hazardType]}</small></td><td>{item.hypothesis}{item.supportingEvidence.length ? <><br /><small>Materiał uzasadniający test: {item.supportingEvidence.join(' ')}</small></> : null}</td><td><StatusBadge value={sourceState(item.status)} /></td><td><ul>{item.requiredChecks.map(check => <li key={check}>{check}</li>)}</ul></td></tr>)}
        </tbody></table></div>
      </section>

      <section className="card lab-alert-card">
        <div className="lab-section-title"><div><p className="eyebrow">ALERTOWANIE</p><h2>{result.alertDraft.title}</h2></div><div className="lab-status-stack"><StatusBadge value={sourceState(result.alertDraft.status)} /><StatusBadge value={result.alertDraft.delivery} /></div></div>
        <p>{result.alertDraft.message}</p>
        <div className="grid two">
          <article><h3>Adresaci do decyzji człowieka</h3><ul>{result.alertDraft.audiences.map(item => <li key={item}>{item}</li>)}</ul></article>
          <article><h3>Wymagania przed publikacją</h3><ul>{result.alertDraft.publicationRequirements.map(item => <li key={item}>{item}</li>)}</ul></article>
        </div>
        <p><b>Aplikacja niczego nie wysłała.</b> Ten szkic można przekazać dopiero po sprawdzeniu źródeł, sytuacji terenowej i właściwego adresata.</p>
      </section>

      <section className="card">
        <h2>Warunkowe działania techniczne: naprawa, regeneracja, monitoring</h2>
        <p className="lab-note">To warianty do oceny przez inżyniera i właściwy organ. Sam obraz satelitarny nie upoważnia do usuwania zatoru, przebudowy odpływu, robót ziemnych ani sterowania lawiną.</p>
        <div className="lab-recovery-grid">
          {result.recoveryOptions.map((item, index) => <article key={`${item.hazardType}-${item.phase}-${index}`}><StatusBadge value={item.phase} /><h3>{item.option}</h3><p><b>Warunek:</b> {item.precondition}</p><small><b>Bramka odpowiedzialności:</b> {item.authorityGate}</small></article>)}
        </div>
      </section>

      {result.analogues ? <section className="card">
        <h2>Podobne sytuacje z kilkunastu regionów świata</h2>
        <p>Przeszukano <b>{result.analogues.searchedCases}</b> zwalidowanych przypadków; wybrano <b>{result.analogues.selectedCases.length}</b> zróżnicowanych regionalnie. Każdy ma status <StatusBadge value={result.analogues.transferability} />.</p>
        <div className="table-wrap"><table><thead><tr><th>Region</th><th>Znane mechanizmy w tamtym przypadku</th><th>Wzór / lekcja</th><th>Źródła</th></tr></thead><tbody>
          {result.analogues.selectedCases.map(item => <tr key={item.id}><td><b>{item.name}</b><br /><small>{item.countries.join(', ')}</small></td><td>{item.mechanisms.join(', ')}</td><td>{item.observed_pattern ?? 'brak opisu'}<br /><small>{item.management_lesson}</small></td><td>{item.source_urls.map((url, index) => <span key={url}><a href={url} target="_blank" rel="noreferrer">Źródło {index + 1} ↗</a>{index < item.source_urls.length - 1 ? ' · ' : ''}</span>)}</td></tr>)}
        </tbody></table></div>
      </section> : null}

      {result.test001Context ? <section className="card">
        <h2>Preset TEST 001 — zapisany sygnał i porównanie Toruń</h2>
        <div className="grid two">
          <article><StatusBadge value="ANOMALY" /><h3>Co jest potwierdzone w zapisanym materiale</h3><p>Powtarzalne obrazy silnie wspierają niemal całkowity zanik historycznego trwałego lustra. Historyczny obrys: <b>{result.test001Context.evidence.recordedResult.historicalPersistentFootprintM2.toLocaleString('pl-PL')} m² ({result.test001Context.evidence.recordedResult.historicalPersistentFootprintHa.toFixed(4)} ha)</b>.</p><p>Dokładna resztkowa powierzchnia wody w 2026, dokładny procent utraty i przyczyna: <b>nieustalone</b>.</p></article>
          <article><StatusBadge value={result.test001Context.reference.status} /><h3>Baza „Toruń”</h3><p>{result.test001Context.reference.comparisonFinding}</p><p><b>Potrzebne:</b> {result.test001Context.reference.requiredHumanAction}</p></article>
        </div>
        {showExtended ? <details><summary>Źródła o cieku głównym, dopływach i odpływach</summary><ul>
          {result.test001Context.connectivity.map(item => <li key={`${item.sourceUrl}-${item.contentLocator}`}><b>{item.classification}:</b> {item.statement} <a href={item.sourceUrl} target="_blank" rel="noreferrer">źródło ↗</a><br /><small>{item.limitation}</small></li>)}
        </ul></details> : null}
      </section> : null}

      <section className="card">
        <h2>Weryfikacja terenowa i awans hipotezy</h2>
        <div className="grid two">
          <article><StatusBadge value={result.verification.state} /><h3>Obecna bramka</h3><p>{result.verification.reason}</p><ul>{result.verification.checks.map(item => <li key={item}>{item}</li>)}</ul></article>
          <article><StatusBadge value="VERIFIED FINDING LOCKED" /><h3>Co jest wymagane</h3><ul>{result.promotionGate.requirements.map(item => <li key={item}>{item}</li>)}</ul><p>Ten przebieg ma <b>verifiedFindingAllowed: false</b>. Zapis terenowy przechodzi przez osobne narzędzie wymagające jawnej akceptacji człowieka.</p></article>
        </div>
        <h3>Plan pomiarów terenowych</h3>
        <ol>{result.requiredFieldChecks.map(item => <li key={item}>{item}</li>)}</ol>
      </section>

      <section className="card">
        <h2>Ograniczenia, których raport nie ukrywa</h2>
        <ul>{result.limitations.map(item => <li key={item}>{item}</li>)}</ul>
      </section>

      <ProvenanceViewer records={result.provenance} />
      </> : null}
    </> : null}
  </>
}
