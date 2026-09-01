import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  HAZARD_LABELS,
  HAZARD_TYPES,
  type HazardInvestigationInput,
  type HazardInvestigationResult,
  type HazardType,
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
  createResearchArchiveEntry,
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
}

const CURRENT_YEAR = new Date().getUTCFullYear()

const PRESETS: Record<Exclude<FormState['preset'], 'custom'>, Omit<FormState, 'preset'>> = {
  test001: {
    regionQuery: 'Staw leśny przy Jeziorze Kuchnia, Polska — TEST 001',
    latitude: '53.591400',
    longitude: '19.010717',
    radiusKm: '2',
    startYear: '1990',
    endYear: String(CURRENT_YEAR),
    season: 'autumn',
    hazards: ['water-loss', 'flow-obstruction', 'terrain-change'],
    depth: 'deep',
    timelineMode: 'annual',
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
  },
}

const INITIAL_FORM: FormState = { preset: 'test001', ...PRESETS.test001 }

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
  return value.replaceAll('_', ' ')
}

function archiveStatusMessage(storage: ResearchArchiveStorage, count: number, automatic: boolean) {
  const action = automatic ? 'Badanie zapisano automatycznie.' : 'Zapis badania potwierdzony.'
  if (storage === 'local') return `${action} Archiwum tej przeglądarki: ${count} ${count === 1 ? 'wpis' : 'wpisów'}.`
  if (storage === 'session') return `${action} Zapis jest tymczasowy do zamknięcia karty, ponieważ trwała pamięć przeglądarki jest zablokowana.`
  return `${action} Zapis działa tylko w tym otwartym widoku. Użyj „Eksportuj pełny JSON”, ponieważ przeglądarka blokuje pamięć.`
}

export function LabMcp() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [result, setResult] = useState<HazardInvestigationResult | null>(null)
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)
  const [placeMatches, setPlaceMatches] = useState<LocationMatch[]>([])
  const [placeStatus, setPlaceStatus] = useState('')
  const [searchingPlace, setSearchingPlace] = useState(false)
  const [showExtended, setShowExtended] = useState(false)
  const [showImagery, setShowImagery] = useState(false)
  const [archiveStatus, setArchiveStatus] = useState('')
  const [archiveCount, setArchiveCount] = useState(() => readResearchArchive().length)
  const [imageDimensions, setImageDimensions] = useState<Record<string, string>>({})
  const [imageryDisplay, setImageryDisplay] = useState<ImageryDisplaySettings>(() => normalizeImageryDisplay(readLocalJson(IMAGERY_DISPLAY_KEY, DEFAULT_IMAGERY_DISPLAY)))

  useEffect(() => {
    writeLocalJson(IMAGERY_DISPLAY_KEY, imageryDisplay)
  }, [imageryDisplay])

  const selectPreset = (preset: FormState['preset']) => {
    setPlaceMatches([])
    setPlaceStatus('')
    if (preset === 'custom') {
      setForm(current => ({ ...current, preset, regionQuery: '', latitude: '', longitude: '', radiusKm: '25', hazards: ['water-loss'], timelineMode: 'representative' }))
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
      setArchiveCount(saved.entries.length)
      setArchiveStatus(archiveStatusMessage(saved.storage, saved.entries.length, automatic))
    } catch (reason) {
      setArchiveStatus(reason instanceof Error ? reason.message : String(reason))
    }
  }

  const run = async () => {
    setRunning(true)
    setError('')
    setResult(null)
    setArchiveStatus('')
    setShowExtended(false)
    setShowImagery(false)
    try {
      const latitude = form.latitude.trim() ? Number(form.latitude) : undefined
      const longitude = form.longitude.trim() ? Number(form.longitude) : undefined
      const input: HazardInvestigationInput = {
        regionQuery: form.regionQuery,
        ...(latitude === undefined ? {} : { latitude }),
        ...(longitude === undefined ? {} : { longitude }),
        radiusKm: Number(form.radiusKm),
        startYear: Number(form.startYear),
        endYear: Number(form.endYear),
        season: form.season,
        hazardTypes: form.hazards,
        depth: form.depth,
        timelineMode: form.timelineMode,
        referenceQuery: form.preset === 'test001' ? 'Toruń' : undefined,
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

  const modelPreviewPool = result?.imagery.analysis?.analysis_images ?? result?.imagery.analysis?.preview_images ?? []
  const modelPreviewImages = result ? selectModelPreviewImages(modelPreviewPool, result.imagery.visuallyInspectedByModel) : []
  const displayFilter = imageryDisplayFilter(imageryDisplay)
  const displayFilterStyle = imageryDisplay.preset === 'natural'
    && imageryDisplay.brightness === 100
    && imageryDisplay.contrast === 100
    && imageryDisplay.saturation === 100
    && imageryDisplay.hue === 0
    ? undefined
    : { filter: displayFilter }
  const availableImageCount = result
    ? modelPreviewImages.length + result.imagery.slots.filter(item => item.status === 'image').length
    : 0

  return <>
    <section className="card lab-hero">
      <div>
        <p className="eyebrow">LABTERRA WEBMCP · HIPOTETYCZNE ZAGROŻENIA I PRZYCZYNY</p>
        <h1>Laboratorium dochodzeń środowiskowych</h1>
        <p>Wskaż dowolny region i okres. Agenci pobiorą prawdziwe źródła satelitarne, oddzielą obrazy obejrzane przez model od samych metadanych, zbudują konkurencyjne hipotezy, szkic alertu i bezpieczne warianty naprawy lub regeneracji.</p>
      </div>
      <div className="lab-status-stack">
        <StatusBadge value={result?.classification ?? 'NOT RUN'} />
        <StatusBadge value={result?.signalState ?? 'AWAITING AREA'} />
        <StatusBadge value={result ? `QA ${result.qaStatus}` : 'FIELD VERIFICATION REQUIRED'} />
      </div>
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
      </div>

      <div className="toolbar lab-run-toolbar">
        <button type="button" className="lab-primary" onClick={run} disabled={running}>{running ? 'Agenci pobierają i weryfikują prawdziwe źródła…' : 'Uruchom agentów i analizę wieloletnią'}</button>
        <button type="button" onClick={exportJson} disabled={!result}>Eksportuj pełny JSON</button>
      </div>
      {running ? <p className="lab-progress" role="status">Trwa połączenie z Terra Worker, NASA/USGS/Copernicus, DEM i bazami analogii. Nie wyświetlamy symulowanych wyników — raport pojawi się dopiero po odpowiedzi źródeł.</p> : null}
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
      </section> : null}

      {showImagery ? <>
      <section className="card lab-media-section">
        <ImageryControls value={imageryDisplay} onChange={setImageryDisplay} />
      </section>

      {modelPreviewImages.length ? <section className="card lab-model-inputs lab-media-section">
        <div className="lab-section-title"><div><p className="eyebrow">ORYGINALNE WEJŚCIA ANALIZY</p><h2>Obrazy obejrzane przez model</h2></div><StatusBadge value={`${modelPreviewImages.length} INSPECTED`} /></div>
        <p className="lab-note">Model otrzymał oryginalne obrazy źródłowe. Suwaki powyżej zmieniają tylko Twój podgląd i nie zmieniają już wykonanej analizy.</p>
        <div className="lab-imagery-grid lab-model-imagery">
          {modelPreviewImages.map((image, index) => {
            const imageKey = `model-${image.date}-${index}`
            return <figure key={imageKey}>
              <a className="lab-image-link" href={image.url} target="_blank" rel="noreferrer"><img src={mobilePreviewUrl(image.url)} style={displayFilterStyle} loading="lazy" decoding="async" alt={`Obraz wejściowy modelu ${image.date}`} onLoad={event => setImageDimensions(current => ({ ...current, [imageKey]: `${event.currentTarget.naturalWidth}×${event.currentTarget.naturalHeight}` }))} /></a>
              <figcaption><b>{image.date}</b><span>{image.source}</span><small>NATURAL-COLOR RGB · lekki podgląd {imageDimensions[imageKey] ?? 'sprawdzany'} · kliknij, aby otworzyć oryginał</small></figcaption>
            </figure>
          })}
        </div>
      </section> : null}

      <section className="card lab-media-section">
        <div className="lab-section-title"><div><p className="eyebrow">MATERIAŁ KATALOGOWY</p><h2>Roczna galeria porównawcza</h2></div><StatusBadge value={`${result.imagery.missingYears} MISSING`} /></div>
        <p className="lab-note">Oddzielona od wejść modelu. Landsat może być miniaturą całej obróconej sceny, nawet 300×300 — wtedy służy tylko do wyboru źródła, a nie rozpoznawania małego stawu. Obraz nie jest już przycinany; kliknięcie otwiera oryginał.</p>
        <div className="lab-imagery-grid">
          {result.imagery.slots.map(slot => slot.status === 'image' && slot.image ? <figure key={slot.year}>
            <a className="lab-image-link" href={slot.image.original_url} target="_blank" rel="noreferrer"><img src={mobilePreviewUrl(slot.image.url)} style={displayFilterStyle} loading="lazy" decoding="async" alt={`Obraz satelitarny dla roku ${slot.year}`} onLoad={event => setImageDimensions(current => ({ ...current, [`gallery-${slot.year}`]: `${event.currentTarget.naturalWidth}×${event.currentTarget.naturalHeight}` }))} /></a>
            <figcaption><b>{slot.year} · {slot.image.date}</b><span>{slot.image.source}</span><small>{slot.image.render_kind ?? 'CATALOGUE BROWSE'} · {slot.image.aoi_cropped === true ? 'wycinek AOI' : 'cała scena / status AOI niepotwierdzony'} · lekki podgląd {imageDimensions[`gallery-${slot.year}`] ?? 'sprawdzany'}</small><small>chmury: {slot.image.cloud_cover === null ? 'brak metadanych' : `${slot.image.cloud_cover.toFixed(1)}%`} · {slot.image.scene_id ?? 'fallback bez ID sceny'}</small></figcaption>
          </figure> : <article className="lab-missing-year" key={slot.year}><b>{slot.year}</b><span>BRAK OBRAZU</span><small>{slot.reason}</small></article>)}
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
          <article><StatusBadge value="ANOMALY" /><h3>Co jest potwierdzone w zapisanym materiale</h3><p>Historyczny trwały obrys widocznego stawu: <b>{result.test001Context.evidence.recordedResult.historicalPersistentFootprintM2.toLocaleString('pl-PL')} m² ({result.test001Context.evidence.recordedResult.historicalPersistentFootprintHa.toFixed(4)} ha)</b>.</p><p>Dokładna powierzchnia wody w 2026, procent utraty i przyczyna: <b>nieopublikowane / niepotwierdzone</b>.</p></article>
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
