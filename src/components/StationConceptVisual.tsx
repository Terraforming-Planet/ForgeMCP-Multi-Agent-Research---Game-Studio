import type { CSSProperties } from 'react'
import stationConcepts from '../assets/research-stations-concepts.webp'
import type { ResearchStationPreset } from '../data/researchStations'

const POSITIONS: Record<ResearchStationPreset['id'], string> = {
  arctic: '0% 50%',
  sahara: '33.333% 50%',
  ocean: '66.666% 50%',
  'earth-space': '100% 50%',
}

export function StationConceptVisual({ station, compact = false }: { station: ResearchStationPreset; compact?: boolean }) {
  const style = {
    '--station-accent': station.accent,
    '--station-secondary': station.secondary,
    backgroundImage: `url(${stationConcepts})`,
    backgroundPosition: POSITIONS[station.id],
  } as CSSProperties

  return (
    <div
      className={`station-concept ${compact ? 'station-concept--compact' : ''}`}
      style={style}
      role="img"
      aria-label={`${station.name} ${station.subtitle} — generated 3D concept model, not a deployed physical station`}
    >
      <span>{station.code}</span>
      <small>GENERATED CONCEPT · NOT DEPLOYED HARDWARE</small>
    </div>
  )
}
