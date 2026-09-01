import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HAZARD_LABELS, type HazardType } from '../integrations/terra/hazardInvestigation'
import { readResearchArchive } from '../lib/researchArchive'
import { StatusBadge } from './StatusBadge'

export function ResearchArchive() {
  const [entries] = useState(() => readResearchArchive())

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
      <div className="toolbar"><Link className="button-link" to="/labmcp">Wróć do LabTerra</Link><button type="button" onClick={exportArchive} disabled={!entries.length}>Eksportuj archiwum JSON</button></div>
      <p className="lab-note"><b>Zapis lokalny:</b> archiwum pozostaje w tej przeglądarce. Nie jest automatycznym treningiem ani prawdą terenową. Po eksporcie może zostać użyte dopiero jako kandydat do sprawdzonego zbioru, po weryfikacji i decyzji człowieka.</p>
    </section>
    {!entries.length ? <section className="card lab-empty"><h2>Archiwum jest puste</h2><p>Po analizie wybierz „Zapisz swoje badania”. Zostanie zapisany skrót bez surowych obrazów.</p></section> : null}
    <section className="lab-archive-list" aria-label="Zapisane badania">
      {entries.map(entry => <article className="card lab-archive-entry" key={entry.id}>
        <div className="lab-section-title"><div><p className="eyebrow">{new Date(entry.savedAt).toLocaleString('pl-PL')}</p><h2>{entry.title}</h2></div><div className="lab-status-stack"><StatusBadge value={entry.classification} /><StatusBadge value={entry.verificationState} /></div></div>
        <p><b>AOI:</b> promień {entry.area.radiusKm} km · {entry.period.startYear}–{entry.period.endYear} · {entry.period.season}</p>
        <ul>{entry.shortSummary.map((item, index) => <li key={`${entry.id}-summary-${index}`}>{item}</li>)}</ul>
        <details><summary>Hipotezy i wymagane sprawdzenia</summary>
          {entry.hypotheses.map(item => <section key={`${entry.id}-${item.id}`}><h3>{HAZARD_LABELS[item.hazardType as HazardType] ?? item.hazardType}</h3><p><StatusBadge value={item.status} /> {item.hypothesis}</p><ul>{item.requiredChecks.map(check => <li key={check}>{check}</li>)}</ul></section>)}
        </details>
        <small>{entry.imagery.inspectedByModel} obrazów obejrzanych przez model · {entry.imagery.galleryImages}/{entry.imagery.requestedYears} kart galerii · ustawienia obrazu zapisane jako DISPLAY_ONLY.</small>
      </article>)}
    </section>
  </>
}
