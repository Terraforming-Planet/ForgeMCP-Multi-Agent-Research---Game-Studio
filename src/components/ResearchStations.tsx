import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { RESEARCH_STATION_PRESETS, type ResearchStationPresetId } from '../data/researchStations'
import type { ResearchStation } from '../types/core'
import { readLocalJson, writeLocalJson } from '../lib/storage'
import { StationConceptVisual } from './StationConceptVisual'
import { LiveProjectFrame } from './LiveProjectFrame'

const storageKey = 'forgemcp.researchStations'

const emptyStation = {
  name: '',
  researchQuestion: '',
  aoi: '',
  coordinates: '',
  timespan: '',
  datasets: '',
}

export function ResearchStations() {
  const [form, setForm] = useState(emptyStation)
  const [stations, setStations] = useState<ResearchStation[]>(() => readLocalJson(storageKey, [] as ResearchStation[]))
  const [selected, setSelected] = useState<string | null>(null)
  const [sourceStationId, setSourceStationId] = useState<ResearchStationPresetId>('arctic')

  const station = useMemo(() => stations.find((item) => item.id === selected), [selected, stations])
  const sourceStation = useMemo(() => RESEARCH_STATION_PRESETS.find(item => item.id === sourceStationId) ?? RESEARCH_STATION_PRESETS[0], [sourceStationId])

  function createStation() {
    if (!form.name || !form.aoi || !form.coordinates) return
    const now = new Date().toISOString()
    const item: ResearchStation = {
      id: crypto.randomUUID(),
      name: form.name,
      researchQuestion: form.researchQuestion,
      aoi: form.aoi,
      coordinates: form.coordinates,
      timespan: form.timespan,
      datasets: form.datasets.split(',').map((x) => x.trim()).filter(Boolean),
      observations: [],
      findings: [],
      hypotheses: [],
      alerts: [],
      verificationState: 'INSUFFICIENT_DATA',
      provenance: [],
      createdAt: now,
      updatedAt: now,
    }
    const next = [item, ...stations]
    setStations(next)
    writeLocalJson(storageKey, next)
    setForm(emptyStation)
  }

  function selectSourceStation(id: ResearchStationPresetId) {
    setSourceStationId(id)
    window.requestAnimationFrame(() => document.getElementById('source-station-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  return (
    <>
      <section className="card station-intro">
        <p className="eyebrow">FOUR SHARED RESEARCH-STATION CONCEPTS</p>
        <h1>Earth missions become visual systems for Game Studio</h1>
        <p>Arctic, Sahara, Ocean and Earth–Space are reusable mission and design presets. In Terra they focus the investigation; in Game Studio their materials, colours and geometry inspire reversible board, piece and texture concepts.</p>
        <p className="lab-note"><b>Truth boundary:</b> these images are generated concept models. They are not deployed physical stations and they do not provide live telemetry.</p>
      </section>

      <section className="station-grid" aria-label="Four ForgeMCP research station presets">
        {RESEARCH_STATION_PRESETS.map(item => (
          <article className="station-card" key={item.id} style={{ borderColor: `${item.accent}66` }}>
            <StationConceptVisual station={item} />
            <div className="station-card__body">
              <p className="eyebrow">{item.name}</p>
              <h2>{item.subtitle}</h2>
              <p>{item.mission}</p>
              <dl className="station-facts">
                <div><dt>Source status</dt><dd>{item.status}</dd></div>
                <div><dt>Signals</dt><dd>{item.hazards.join(' · ')}</dd></div>
                <div><dt>Evidence lane</dt><dd>{item.sources.join(' · ')}</dd></div>
                <div><dt>Game material</dt><dd>{item.gameApplication}</dd></div>
              </dl>
              <div className="station-work-grid">
                <div><h3>What runs now</h3><ul>{item.implementedWork.map(task => <li key={task}>{task}</li>)}</ul></div>
                <div><h3>What we would do at the station</h3><ul>{item.fieldProgram.map(task => <li key={task}>{task}</li>)}</ul></div>
              </div>
              <p className="station-output"><b>Evidence outputs:</b> {item.evidenceOutputs.join(' · ')}</p>
              <p className="lab-note">{item.truthBoundary}</p>
              <div className="toolbar">
                {item.terraPresetAvailable ? <Link className="button-link" to={`/labmcp?station=${item.id}&region=${encodeURIComponent(item.regionQuery)}`}>Investigate with Terra</Link> : null}
                <button type="button" onClick={() => selectSourceStation(item.id)}>Select live preview</button>
                <a className="button-link" href={item.publicUrl} target="_blank" rel="noreferrer">Open source station ↗</a>
                <Link className="button-link button-link--quiet" to={`/game-studio?station=${item.id}`}>Use in Game Studio</Link>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="card source-station-preview" id="source-station-preview">
        <LiveProjectFrame
          key={sourceStation.id}
          title={`${sourceStation.name} · ${sourceStation.subtitle}`}
          url={sourceStation.publicUrl}
          description={`Load the original ${sourceStation.name} public research interface from the Polar Sun Moon Analysis repository. ForgeMCP keeps it separate from the concept image and from any physical-station claim.`}
          loadLabel={`Load ${sourceStation.name} source lab`}
          instructions={sourceStation.implementedWork.join(' · ')}
        />
      </section>

      <section className="card custom-stations">
        <details>
          <summary>Create an additional local research station</summary>
          <p className="lab-note">Custom entries remain only in this browser. They do not create a physical station or cloud telemetry.</p>
          <div className="grid two">
            <div>
              <input aria-label="Station name" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input aria-label="Research question" placeholder="Research question" value={form.researchQuestion} onChange={(e) => setForm({ ...form, researchQuestion: e.target.value })} />
              <input aria-label="Area of interest" placeholder="AOI" value={form.aoi} onChange={(e) => setForm({ ...form, aoi: e.target.value })} />
              <input aria-label="Coordinates" placeholder="Coordinates" value={form.coordinates} onChange={(e) => setForm({ ...form, coordinates: e.target.value })} />
              <input aria-label="Timespan" placeholder="Timespan" value={form.timespan} onChange={(e) => setForm({ ...form, timespan: e.target.value })} />
              <input aria-label="Datasets" placeholder="Datasets (comma-separated)" value={form.datasets} onChange={(e) => setForm({ ...form, datasets: e.target.value })} />
              <button type="button" onClick={createStation}>Create local station</button>
            </div>
            <div>
              {stations.length ? <ul className="station-local-list">
                {stations.map((item) => <li key={item.id}><button type="button" onClick={() => setSelected(item.id)}>{item.name}</button></li>)}
              </ul> : <p>No additional local stations yet.</p>}
              {station ? <pre>{JSON.stringify(station, null, 2)}</pre> : null}
            </div>
          </div>
        </details>
      </section>
    </>
  )
}
