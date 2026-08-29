import type { IntegrationHealth, ProvenanceRecord } from '../../types/core'

export const TERRA_APP_URL = 'https://terraforming-planet.github.io/Polar-Sun-Moon-Analysis/'

export interface TerraObservation {
  title: string
  categories: string[]
  source: string
  date: string
  geometryType: string
}

export async function checkTerraHealth(): Promise<IntegrationHealth> {
  try {
    const response = await fetch(TERRA_APP_URL, { method: 'GET' })
    if (!response.ok) return 'DEGRADED'
    return 'CONNECTED'
  } catch {
    return 'NOT_CONNECTED'
  }
}

export async function searchLocation(query: string) {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', '5')

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Location search failed with status ${response.status}`)
  }

  const body = (await response.json()) as Array<{ display_name: string; lat: string; lon: string }>
  return body.map((item) => ({
    displayName: item.display_name,
    lat: Number(item.lat),
    lon: Number(item.lon),
  }))
}

export async function findObservations(lat: number, lon: number, days: number) {
  const boundedDays = Math.min(60, Math.max(1, days))
  const since = new Date(Date.now() - boundedDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const url = new URL('https://eonet.gsfc.nasa.gov/api/v3/events')
  url.searchParams.set('days', String(boundedDays))
  url.searchParams.set('status', 'open')

  const response = await fetch(url.toString())
  if (!response.ok) throw new Error(`Observation query failed ${response.status}`)

  const body = (await response.json()) as { events: Array<{ title: string; categories: Array<{ title: string }>; sources: Array<{ id: string }>; geometry: Array<{ date: string; type: string; coordinates?: unknown }> }> }

  const events = body.events
    .filter((event) =>
      event.geometry.some((g) => {
        if (!Array.isArray(g.coordinates)) return false
        const c = g.coordinates as unknown[]
        if (typeof c[0] !== 'number' || typeof c[1] !== 'number') return false
        const [eventLon, eventLat] = c as [number, number]
        return Math.abs(eventLat - lat) <= 10 && Math.abs(eventLon - lon) <= 10
      }),
    )
    .slice(0, 8)
    .map<TerraObservation>((event) => ({
      title: event.title,
      categories: event.categories.map((c) => c.title),
      source: event.sources.map((s) => s.id).join(', ') || 'UNKNOWN',
      date: event.geometry[0]?.date ?? since,
      geometryType: event.geometry[0]?.type ?? 'unknown',
    }))

  return {
    source: 'NASA EONET',
    observations: events,
    provenance: [
      {
        provider: 'NASA',
        dataset: 'EONET v3',
        aoi: `${lat},${lon}`,
        dateTime: new Date().toISOString(),
        operation: 'find_observations',
        tool: 'find_observations',
        timestamp: new Date().toISOString(),
        requestParameters: { lat, lon, days: boundedDays },
      } satisfies ProvenanceRecord,
    ],
  }
}
