import type { ResearchStationPreset } from '../data/researchStations'
import { StatusBadge } from './StatusBadge'

export function PlayableStationWorlds({ station }: { station: ResearchStationPreset }) {
  const base = import.meta.env.BASE_URL
  const playableUrl = `${base}playable-worlds/index.html?world=${encodeURIComponent(station.id)}&embed=1`

  return (
    <section className="card" aria-label={`${station.name} playable research world`}>
      <div className="lab-section-title">
        <div>
          <p className="eyebrow">PLAYABLE RESEARCH WORLD · REAL SOURCE LINKED · WEBMCP</p>
          <h2>Explore {station.name} with Earth Guardian</h2>
        </div>
        <StatusBadge value="PLAYABLE 3D" />
      </div>
      <p>
        Earth Guardian is the controllable character. The same world exposes orbit-camera controls, mobile zoom,
        station interaction and a deterministic runtime 3D + texture generator. The 3D scene is a visualization;
        scientific evidence remains in the linked Terra source application.
      </p>
      <iframe
        key={station.id}
        title={`${station.name} playable ForgeMCP research world`}
        src={playableUrl}
        loading="lazy"
        allow="fullscreen"
        style={{ width: '100%', minHeight: 'min(78vh, 760px)', border: '1px solid #23597b', borderRadius: 14, background: '#030713' }}
      />
      <div className="toolbar">
        <a className="button-link button-link--primary" href={playableUrl} target="_blank" rel="noreferrer">Open playable world full-screen ↗</a>
        <a className="button-link" href={station.publicUrl} target="_blank" rel="noreferrer">Open real Terra source ↗</a>
      </div>
      <p className="lab-note">
        <b>Truth boundary:</b> station hardware, Earth Guardian, excavator, terrain deformation and generated runtime assets are game/visualization content. They do not prove deployed equipment or replace original satellite, field or provider evidence.
      </p>
    </section>
  )
}
