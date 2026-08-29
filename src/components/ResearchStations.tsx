import { useMemo, useState } from 'react'
import type { ResearchStation } from '../types/core'
import { readLocalJson, writeLocalJson } from '../lib/storage'

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

  const station = useMemo(() => stations.find((item) => item.id === selected), [selected, stations])

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

  return (
    <section className="card">
      <h2>Research Stations</h2>
      <p>Local persistence only for this stage.</p>
      <div className="grid two">
        <div>
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Research question" value={form.researchQuestion} onChange={(e) => setForm({ ...form, researchQuestion: e.target.value })} />
          <input placeholder="AOI" value={form.aoi} onChange={(e) => setForm({ ...form, aoi: e.target.value })} />
          <input placeholder="Coordinates" value={form.coordinates} onChange={(e) => setForm({ ...form, coordinates: e.target.value })} />
          <input placeholder="Timespan" value={form.timespan} onChange={(e) => setForm({ ...form, timespan: e.target.value })} />
          <input placeholder="Datasets (comma-separated)" value={form.datasets} onChange={(e) => setForm({ ...form, datasets: e.target.value })} />
          <button type="button" onClick={createStation}>Create station</button>
        </div>
        <div>
          <ul>
            {stations.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => setSelected(item.id)}>{item.name}</button>
              </li>
            ))}
          </ul>
          {station ? <pre>{JSON.stringify(station, null, 2)}</pre> : <p>Select a station.</p>}
        </div>
      </div>
    </section>
  )
}
