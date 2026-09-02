import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HAZARD_LABELS, type HazardType } from '../integrations/terra/hazardInvestigation'
import { readResearchArchive, type ResearchArchiveEntry } from '../lib/researchArchive'
import { StatusBadge } from './StatusBadge'

function ArchivedTest001Finding({ entry }: { entry: ResearchArchiveEntry }) {
  const finding = entry.test001Finding
  if (!finding) return null
  return <section className="lab-test001-focus" aria-label="Zapisany wynik TEST 001">
    <div className="lab-section-title"><h3>TEST 001 — zanik historycznego lustra</h3><StatusBadge value="HIGH PRIORITY ANOMALY" /></div>
    <p><b>Silnie wspierany wynik:</b> niemal całkowity zanik historycznego trwałego obrysu wody, około {finding.approximateDisappearedHistoricalFootprintHa.toFixed(2)} ha.</p>
    <div className="lab-metrics lab-water-extrema-metrics">
      <article><b>{finding.mostVisibleHistoricalYear}</b><span>najwięcej w zmierzonych latach · {finding.mostVisibleHistoricalAreaHa.toFixed(2)} ha</span></article>
      <article><b>{finding.leastVisibleEndpointYear}</b><span>najmniej widocznej wody</span></article>
      <article><b>{finding.focus.frameWidthM} m</b><span>stały kadr tego samego stawu</span></article>
    </div>
    <p className="lab-note">Historyczny obrys {finding.historicalPersistentFootprintHa.toFixed(2)} ha; zakres powtarzalnych obrazów {finding.repeatSupportedRangeHa[0].toFixed(2)}–{finding.repeatSupportedRangeHa[1].toFixed(2)} ha. Dokładna resztkowa powierzchnia 2026, dokładny procent i przyczyna pozostają nieustalone.</p>
  </section>
}

function ArchivedWaterExtrema({ entry }: { entry: ResearchArchiveEntry }) {
  if (entry.test001Finding) return null
  const waterHazard = entry.hazards.some(hazard => ['water-loss', 'flow-obstruction', 'flood'].includes(hazard))
  if (!waterHazard) return null
  const extrema = entry.waterExtrema ?? {
    status: 'INSUFFICIENT_EVIDENCE' as const,
    mostVisibleWaterYear: null,
    leastVisibleWaterYear: null,
    comparedYears: [],
    basis: 'Starszy wpis nie zawiera rankingu lat. Uruchom badanie ponownie, aby zastosować bramkę TP26.',
  }
  const established = extrema.status === 'ESTABLISHED'
  return <section className="lab-water-extrema" aria-label="Ranking lat widocznej wody">
    <div className="lab-section-title"><h3>Najwięcej i najmniej widocznej wody</h3><StatusBadge value={established ? 'COMPARABLE YEARS' : 'INSUFFICIENT DATA'} /></div>
    <div className="lab-metrics lab-water-extrema-metrics">
      <article><b>{established ? extrema.mostVisibleWaterYear : 'nie ustalono'}</b><span>najwięcej widocznej wody</span></article>
      <article><b>{established ? extrema.leastVisibleWaterYear : 'nie ustalono'}</b><span>najmniej widocznej wody</span></article>
      <article><b>{extrema.comparedYears.length}</b><span>lat dopuszczonych do porównania</span></article>
    </div>
    <p className="lab-note">{extrema.basis}</p>
  </section>
}

function ArchivedRegionalPatrol({ entry }: { entry: ResearchArchiveEntry }) {
  const patrol = entry.regionalPatrol
  if (!patrol) return null
  return <section className="lab-regional-patrol" aria-label="Zapis patrolu regionalnego">
    <div className="lab-section-title"><h3>Patrol regionalny zbliżeń</h3><StatusBadge value={patrol.status.replaceAll('_', ' ')} /></div>
    <div className="lab-metrics">
      <article><b>{patrol.inspectedTiles}/{patrol.requestedTiles}</b><span>kadrów obejrzanych</span></article>
      <article><b>{patrol.frameWidthKm.toFixed(1)} km</b><span>szerokość kadru</span></article>
      <article><b>≤ {patrol.coverageUpperBoundPercent.toFixed(2)}%</b><span>pokrycie AOI</span></article>
    </div>
    <p className="lab-note">Data źródła: {patrol.sourceDate ?? 'nieustalona'} · natywna rozdzielczość: {patrol.nominalResolutionM ? `około ${patrol.nominalResolutionM} m` : 'nieustalona'}. Co najmniej {patrol.uninspectedAreaLowerBoundPercent.toFixed(2)}% AOI pozostało poza próbkami. Patrol sam nie potwierdza zmiany w czasie.</p>
    {patrol.assessmentOverview ? <p><b>Ocena kadrów:</b> {patrol.assessmentOverview}</p> : null}
    {patrol.tileFindings?.length ? <details><summary>Opisane kadry patrolu ({patrol.tileFindings.length})</summary><ul>{patrol.tileFindings.map(finding => <li key={finding.tileId}><b>{finding.tileId}</b> · {finding.surfaceClass.replaceAll('_', ' ')} · {finding.hydrologyFeature.replaceAll('_', ' ')} · {finding.observation} ({finding.confidence})</li>)}</ul></details> : null}
    <details><summary>Współrzędne zapisanych kadrów</summary><ul>{patrol.tileManifest.map(tile => <li key={tile.tileId}><b>{tile.tileId}</b> · {tile.latitude.toFixed(6)}, {tile.longitude.toFixed(6)} · {tile.status.replaceAll('_', ' ')}</li>)}</ul></details>
  </section>
}

export function ResearchArchive() {
  const [entries, setEntries] = useState(() => readResearchArchive())

  const exportArchive = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), entries }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'labterra-archiwum-badan.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  return <>
    <section className="card lab-hero">
      <div><p className="eyebrow">LABTERRA WEBMCP</p><h1>Archiwum badań</h1><p>Krótkie wnioski, obserwacje i hipotezy zapisane jawnie po zakończeniu przebiegu.</p></div>
      <div className="lab-status-stack"><StatusBadge value={`${entries.length} RECORDS`} /><StatusBadge value="HUMAN CURATION" /></div>
    </section>
    <section className="card">
      <div className="toolbar"><Link className="button-link" to="/labmcp">Wróć do LabTerra</Link><button type="button" onClick={() => setEntries(readResearchArchive())}>Odśwież archiwum</button><button type="button" onClick={exportArchive} disabled={!entries.length}>Eksportuj archiwum JSON</button></div>
      <p className="lab-note"><b>Zapis lokalny:</b> archiwum pozostaje w tej przeglądarce. Nie jest automatycznym treningiem ani prawdą terenową. Po eksporcie może zostać użyte dopiero jako kandydat do sprawdzonego zbioru, po weryfikacji i decyzji człowieka.</p>
    </section>
    {!entries.length ? <section className="card lab-empty"><h2>Archiwum jest puste</h2><p>Każda zakończona analiza zapisuje teraz automatycznie skrót bez ciężkich, surowych obrazów. Możesz też użyć przycisku „Zapisz ponownie”.</p></section> : null}
    <section className="lab-archive-list" aria-label="Zapisane badania">
      {entries.map(entry => <article className="card lab-archive-entry" key={entry.id}>
        <div className="lab-section-title"><div><p className="eyebrow">{new Date(entry.savedAt).toLocaleString('pl-PL')}</p><h2>{entry.title}</h2></div><div className="lab-status-stack"><StatusBadge value={entry.classification} /><StatusBadge value={entry.verificationState} /></div></div>
        <p><b>AOI:</b> promień {entry.area.radiusKm} km · {entry.period.startYear}–{entry.period.endYear} · {entry.period.season}</p>
        <ArchivedTest001Finding entry={entry} />
        <ArchivedWaterExtrema entry={entry} />
        <ArchivedRegionalPatrol entry={entry} />
        <ul>{entry.shortSummary.map((item, index) => <li key={`${entry.id}-summary-${index}`}>{item}</li>)}</ul>
        {entry.hydrology ? <details><summary>Dopływy, odpływy i ubytek wody</summary>
          <p><b>Zmiana wody:</b> {entry.hydrology.waterChangeState}</p>
          <p><b>Dopływy/odpływy:</b> {entry.hydrology.inflowOutflowStatus}</p>
          <p>{entry.hydrology.mainAndTributaryContext}</p>
          {entry.hydrology.candidateFeatures.length ? <ul>{entry.hydrology.candidateFeatures.map(item => <li key={item}>{item}</li>)}</ul> : null}
          <p><b>Przyczyna:</b> {entry.hydrology.causeStatus}</p>
        </details> : null}
        <details><summary>Hipotezy i wymagane sprawdzenia</summary>
          {entry.hypotheses.map(item => <section key={`${entry.id}-${item.id}`}><h3>{HAZARD_LABELS[item.hazardType as HazardType] ?? item.hazardType}</h3><p><StatusBadge value={item.status} /> {item.hypothesis}</p><ul>{item.requiredChecks.map(check => <li key={check}>{check}</li>)}</ul></section>)}
        </details>
        <small>{entry.imagery.inspectedByModel} obrazów obejrzanych przez model · {entry.imagery.galleryImages}/{entry.imagery.requestedYears} kart galerii · ustawienia obrazu zapisane jako DISPLAY_ONLY.</small>
        <p className="lab-note"><b>Pochodzenie wejść modelu:</b> {entry.imagery.modelInputRule === 'ORIGINAL_OFFICIAL_SATELLITE_PRODUCTS_ONLY'
          ? `${entry.imagery.originalModelInputs ?? 0} oryginalnych oficjalnych produktów satelitarnych · ${entry.imagery.derivedModelInputs ?? 0} produktów pochodnych · ${entry.imagery.aiGeneratedModelInputs ?? 0} obrazów AI.`
          : 'starszy wpis bez jawnej bramki pochodzenia — wymaga ponownego przebiegu.'}</p>
      </article>)}
    </section>
  </>
}
