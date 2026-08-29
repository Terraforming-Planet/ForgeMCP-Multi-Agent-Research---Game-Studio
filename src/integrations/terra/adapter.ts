import type { IntegrationHealth, ProvenanceRecord } from '../../types/core'

export const TERRA_APP_URL = 'https://terraforming-planet.github.io/Polar-Sun-Moon-Analysis/'
export const TERRA_UPSTREAM_COMMIT = 'fd47cbf1137b1094e932b6657cbb4af4de9373d7'

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

export interface AreaOfInterest { name:string; lat:number; lon:number; radiusKm:number }
export interface TerraStation { id:string; name:string; aoi:AreaOfInterest; startDate:string; endDate:string; createdAt:string }
const stations = new Map<string,TerraStation>()
export function setAreaOfInterest(input:AreaOfInterest):AreaOfInterest {
  if(!Number.isFinite(input.lat)||input.lat < -90||input.lat > 90||!Number.isFinite(input.lon)||input.lon < -180||input.lon > 180) throw new Error('Invalid WGS84 coordinates')
  return {...input,radiusKm:Math.max(1,Math.min(250,input.radiusKm))}
}
export function createResearchStation(name:string,aoi:AreaOfInterest):TerraStation {const now=new Date().toISOString();const station={id:`station-${Math.abs(Math.round(aoi.lat*10000))}-${Math.abs(Math.round(aoi.lon*10000))}`,name,aoi:setAreaOfInterest(aoi),startDate:now.slice(0,10),endDate:now.slice(0,10),createdAt:now};stations.set(station.id,station);return station}
export function setStationTimespan(stationId:string,startDate:string,endDate:string){const s=stations.get(stationId);if(!s)throw new Error('Station not found');if(startDate>endDate)throw new Error('Start date must precede end date');Object.assign(s,{startDate,endDate});return s}

export async function getElevationProfile(lat:number,lon:number){
  const offsets=[-.02,-.01,0,.01,.02]; const latitude=offsets.map(d=>lat+d); const longitude=offsets.map(()=>lon)
  const url=new URL('https://api.open-meteo.com/v1/elevation');url.searchParams.set('latitude',latitude.join(','));url.searchParams.set('longitude',longitude.join(','))
  try {const response=await fetch(url);if(!response.ok)return {state:'NOT_CONNECTED' as const,error:`Elevation provider HTTP ${response.status}`,samples:[],provenance:[]};const body=await response.json() as {elevation?:number[]};if(!body.elevation?.length)return {state:'INSUFFICIENT_DATA' as const,error:'Provider returned no elevation samples',samples:[],provenance:[]};return {state:'OBSERVATION' as const,samples:body.elevation.map((e,i)=>({lat:latitude[i],lon:longitude[i],elevationM:e})),provenance:[{provider:'Open-Meteo',dataset:'Copernicus DEM GLO-90 elevation API',aoi:`${lat},${lon}`,dateTime:new Date().toISOString(),operation:'get_elevation_profile',tool:'get_elevation_profile',timestamp:new Date().toISOString(),uncertainty:'DEM raster samples, not surveyed ground heights',requestParameters:{lat,lon,samples:5}} satisfies ProvenanceRecord]}}
  catch(error){return {state:'NOT_CONNECTED' as const,error:error instanceof Error?error.message:'Elevation provider unavailable',samples:[],provenance:[]}}
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
