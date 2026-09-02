export type ResearchStationPresetId = 'arctic' | 'sahara' | 'ocean' | 'earth-space'

export interface ResearchStationPreset {
  id: ResearchStationPresetId
  code: string
  name: string
  subtitle: string
  mission: string
  investigationPrompt: string
  regionQuery: string
  hazards: string[]
  sources: string[]
  material: string
  texture: string
  gameApplication: string
  publicUrl: string
  status: string
  truthBoundary: string
  terraPresetAvailable: boolean
  accent: string
  secondary: string
  darkSquare: string
  lightSquare: string
  verification: 'MISSION_PRESET'
}

/**
 * Shared mission presets. These are software workspace concepts, not claims that
 * physical stations have been deployed or that live telemetry is available.
 */
export const RESEARCH_STATION_PRESETS: ResearchStationPreset[] = [
  {
    id: 'arctic',
    code: 'ARCTIC-CRYO',
    name: 'Arctic',
    subtitle: 'Cryosphere Watch',
    mission: 'Investigate ice, snow, water change and avalanche conditions while keeping imagery, hypotheses and field verification separate.',
    investigationPrompt: 'Investigate cryosphere, snow, water and terrain signals in an Arctic area selected by the human operator.',
    regionQuery: 'Svalbard',
    hazards: ['ice / snow change', 'avalanche conditions', 'water change', 'terrain instability'],
    sources: ['NASA', 'ESA / Copernicus', 'USGS', 'NOAA'],
    material: 'Frosted glass + brushed titanium',
    texture: 'Cryo facets · translucent ice grain',
    gameApplication: 'Icy translucent board layers and cyan navigation light',
    publicUrl: 'https://terraforming-planet.github.io/Polar-Sun-Moon-Analysis/arctic-90n/',
    status: 'CONCEPT + 3D PROXY',
    truthBoundary: 'The source station is a research-engineering concept. Its 3D ice lab is a simplified scenario proxy, not an operational forecast or structural calculation.',
    terraPresetAvailable: true,
    accent: '#75efff',
    secondary: '#dffbff',
    darkSquare: '#17324d',
    lightSquare: '#d8f7ff',
    verification: 'MISSION_PRESET',
  },
  {
    id: 'sahara',
    code: 'SAHARA-WATER',
    name: 'Sahara',
    subtitle: 'Water Memory',
    mission: 'Screen dry channels, former water bodies and terrain patterns, then rank competing explanations without declaring a cause from imagery alone.',
    investigationPrompt: 'Investigate water-loss, palaeochannel and terrain-change signals in a Sahara area selected by the human operator.',
    regionQuery: 'Sahara',
    hazards: ['water loss', 'dry channels', 'terrain change', 'extreme heat context'],
    sources: ['NASA', 'ESA / Copernicus', 'USGS', 'NOAA'],
    material: 'Sandstone composite + copper',
    texture: 'Wind-cut strata · warm mineral grain',
    gameApplication: 'Sandstone board, copper paths and amber legal-move glow',
    publicUrl: 'https://terraforming-planet.github.io/Polar-Sun-Moon-Analysis/sahara-station/',
    status: 'PROCEDURAL 3D SIMULATOR',
    truthBoundary: 'Terrain, water and vegetation changes inside the source sandbox are synthetic scenarios, not observed future states.',
    terraPresetAvailable: true,
    accent: '#ffc767',
    secondary: '#ffe2a9',
    darkSquare: '#5b331d',
    lightSquare: '#e3b96b',
    verification: 'MISSION_PRESET',
  },
  {
    id: 'ocean',
    code: 'OCEAN-BLUE',
    name: 'Ocean',
    subtitle: 'Blue Sentinel',
    mission: 'Inspect coast, surface-water and extreme-event context using public sources, with ocean measurements required before any verified finding.',
    investigationPrompt: 'Investigate coastal-change, flood and extreme-event signals in an ocean or coastal area selected by the human operator.',
    regionQuery: 'North Atlantic Ocean',
    hazards: ['coastal change', 'flood context', 'surface-water change', 'extreme events'],
    sources: ['NASA', 'ESA / Copernicus', 'USGS', 'NOAA'],
    material: 'Deep-glass ceramic + marine alloy',
    texture: 'Bathymetric waves · wet iridescence',
    gameApplication: 'Deep-blue board depth, teal current lines and reflective pieces',
    publicUrl: 'https://terraforming-planet.github.io/Polar-Sun-Moon-Analysis/ocean-station/',
    status: 'PROCEDURAL WEBGL SIMULATOR',
    truthBoundary: 'The source sandbox is not a real intervention, earthquake-control system or measured local bathymetric survey.',
    terraPresetAvailable: true,
    accent: '#3fffd1',
    secondary: '#73bfff',
    darkSquare: '#072e49',
    lightSquare: '#43a6c6',
    verification: 'MISSION_PRESET',
  },
  {
    id: 'earth-space',
    code: 'EARTH-SPACE',
    name: 'Earth–Space',
    subtitle: 'Orbital Synthesis',
    mission: 'Coordinate global Earth-observation evidence and orbital context across sources while preserving provenance, uncertainty and human authority.',
    investigationPrompt: 'Investigate a human-selected Earth region with multi-source observation, provenance and verification gates.',
    regionQuery: '',
    hazards: ['multi-hazard screening', 'water change', 'wildfire context', 'coastal / terrain change'],
    sources: ['NASA', 'ESA / Copernicus', 'USGS', 'NOAA'],
    material: 'Obsidian glass + emissive alloy',
    texture: 'Orbital grid · violet data filaments',
    gameApplication: 'Cosmic grid, orbital rings and violet/cyan LEDColor pieces',
    publicUrl: 'https://terraforming-planet.github.io/Polar-Sun-Moon-Analysis/earth-space-512/',
    status: 'EARTH–SPACE OBSERVATION LAB',
    truthBoundary: 'AI comet candidates and orbital-cell observations require human verification; they are not confirmed discoveries or climate alerts.',
    terraPresetAvailable: false,
    accent: '#a77bff',
    secondary: '#56ddff',
    darkSquare: '#171332',
    lightSquare: '#5550a9',
    verification: 'MISSION_PRESET',
  },
]

export function getResearchStationPreset(id: string | null | undefined) {
  return RESEARCH_STATION_PRESETS.find(station => station.id === id) ?? RESEARCH_STATION_PRESETS[3]
}
