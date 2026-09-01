import { useState } from 'react'
import {
  HAZARD_LABELS,
  HAZARD_TYPES,
  type HazardInvestigationInput,
  type HazardInvestigationResult,
  type HazardType,
} from '../integrations/terra/hazardInvestigation'
import { getTool } from '../webmcp/registry'
import { ProvenanceViewer } from './ProvenanceViewer'
import { StatusBadge } from './StatusBadge'

type ToolEnvelope = {
  state?: string
  data?: HazardInvestigationResult
  error?: string
  verification?: string
}

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

function sourceState(value: string) {
  return value.replaceAll('_', ' ')
}

export function LabMcp() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [result, setResult] = useState<HazardInvestigationResult | null>(null)
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)

  const selectPreset = (preset: FormState['preset']) => {
    if (preset === 'custom') {
      setForm(current => ({ ...current, preset, regionQuery: '', latitude: '', longitude: '', radiusKm: '25', hazards: ['water-loss'], timelineMode: 'representative' }))
      return
    }
    setForm({ preset, ...PRESETS[preset] })
  }

  const toggleHazard = (hazard: HazardType) => {
    setForm(current => ({
      ...current,
      hazards: current.hazards.includes(hazard)
        ? current.hazards.filter(item => item !== hazard)
        : [...current.hazards, hazard],
    }))
  }

  const run = async () => {
    setRunning(true)
    setError('')
    setResult(null)
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
      if (!isToolEnvelope(response) || !response.data) throw new Error(isToolEnvelope(response) ? response.error ?? 'LabMCP nie zwrócił wyniku strukturalnego.' : 'Narzędzie WebMCP jest niedostępne.')
      setResult(response.data)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setRunning(false)
    }
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

  return <>
    <section className="card lab-hero">
      <div>
        <p className="eyebrow">LABMCP · TERRA · HIPOTETYCZNE ZAGROŻENIA I PRZYCZYNY</p>
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
        <div><p className="eyebrow">WYBIERZ LUB WPISZ REGION</p><h2>Jedno kliknięcie uruchamia agentów i narzędzia MCP</h2></div>
        <p className="lab-note">TEST 001 jest przykładem, nie ograniczeniem aplikacji. Dla własnego regionu możesz podać samą nazwę — wtedy pierwszy wynik Nominatim zostanie jawnie zapisany do raportu.</p>
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
        <label className="lab-span-two">Nazwa regionu
          <input aria-label="Nazwa regionu" value={form.regionQuery} onChange={event => setForm(current => ({ ...current, regionQuery: event.target.value, preset: 'custom', ...(current.preset === 'custom' ? {} : { latitude: '', longitude: '' }) }))} placeholder="np. dolina rzeki, gmina, jezioro, pasmo górskie" />
        </label>
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
      </section>

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

      {result.imagery.analysis ? <section className="card">
        <div className="lab-section-title"><div><p className="eyebrow">ANALIZA WIZUALNA REPREZENTATYWNYCH SCEN</p><h2>{result.imagery.analysis.analysis.headline}</h2></div><StatusBadge value={`MODEL ${result.imagery.analysis.analysis.confidence.level}`} /></div>
        <div className="grid two">
          <article><h3>Co widać</h3><p>{result.imagery.analysis.analysis.what_is_visible}</p></article>
          <article><h3>Zmiana w czasie</h3><p>{result.imagery.analysis.analysis.change_over_time}</p></article>
          <article><h3>Ocena widocznej wody</h3><p>{result.imagery.analysis.analysis.water_assessment}</p></article>
          <article><h3>Jakościowa ocena modelu — niekalibrowana</h3><p>{result.imagery.analysis.analysis.confidence.reason}</p></article>
        </div>
        <p><b>Następny krok wskazany przez analizę:</b> {result.imagery.analysis.analysis.recommended_next_step}</p>
        <ul>{result.imagery.analysis.analysis.limitations.map(item => <li key={item}>{item}</li>)}</ul>
      </section> : null}

      <section className="card">
        <div className="lab-section-title"><div><p className="eyebrow">MATERIAŁ ŹRÓDŁOWY</p><h2>Galeria wieloletnia</h2></div><StatusBadge value={`${result.imagery.missingYears} MISSING`} /></div>
        <p className="lab-note">Karta z obrazem oznacza oficjalny podgląd Landsat albo jawnie opisany fallback NASA GIBS. Nie twierdzimy, że model obejrzał wszystkie te karty.</p>
        <div className="lab-imagery-grid">
          {result.imagery.slots.map(slot => slot.status === 'image' && slot.image ? <figure key={slot.year}>
            <a href={slot.image.original_url} target="_blank" rel="noreferrer"><img src={slot.image.url} loading="lazy" alt={`Obraz satelitarny dla roku ${slot.year}`} /></a>
            <figcaption><b>{slot.year} · {slot.image.date}</b><span>{slot.image.source}</span><small>chmury: {slot.image.cloud_cover === null ? 'brak metadanych' : `${slot.image.cloud_cover.toFixed(1)}%`} · {slot.image.scene_id ?? 'fallback bez ID sceny'}</small></figcaption>
          </figure> : <article className="lab-missing-year" key={slot.year}><b>{slot.year}</b><span>BRAK OBRAZU</span><small>{slot.reason}</small></article>)}
        </div>
      </section>

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
  </>
}
