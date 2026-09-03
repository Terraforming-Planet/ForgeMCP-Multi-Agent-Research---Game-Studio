import { useMemo, useState } from 'react'
import type { ResearchStationPreset } from '../data/researchStations'
import { createAssetSpecification, type AssetConfiguration } from '../integrations/commerce/productLab'
import { generateProceduralAssetBundle, proceduralAssetManifest } from '../integrations/commerce/proceduralAssets'
import { generateSaharaExcavatorBundle } from '../integrations/terra/saharaExcavatorAsset'
import { ProceduralAssetViewer } from './ProceduralAssetViewer'
import { StatusBadge } from './StatusBadge'

const STATION_PROMPTS: Record<ResearchStationPreset['id'], string> = {
  arctic: `Create a premium 3D Arctic Cryosphere Watch research-station diorama that preserves the visual language and software functions of the source Arctic station while making the physical concept easier to understand. Show a stable ice-platform lab shell, weather/radiometry module, GNSS reference points, LiDAR/radar mast, communications hardware and a clearly separated under-ice sensor string representing CTD, ADCP and upward-looking sonar. Use visibly different surface families: translucent/frosted ice, insulated white composite, brushed titanium/steel instrument frames and restrained cyan navigation light. Keep metal distinct from ice and snow in roughness and silhouette. Keep instrument modules visually distinct and serviceable; no fantasy antennas or impossible floating equipment. The model is a research concept, not proof that hardware is deployed. Export clean UVs, PBR BaseColor/Normal/Roughness/Metallic/AO/Emissive, LODs, GLB/glTF, semantic-part names, bounds, pivot/orientation and provenance QA.`,
  sahara: `Create a premium 3D Sahara Water Memory research-station diorama that visually matches the existing Sahara station and represents its real software workflow: DEM terrain review, Priority-Flood/D8 drainage screening, palaeochannel hypotheses and field-verification planning. Include a compact shaded/domed laboratory, GNSS/weather mast, solar-radiometry array, terrain sample zone and a clearly readable dry-channel/flow-path overlay embedded in the base. Pair the station with a separate tracked terrain excavator concept for access/channel/sampling visualization: construction-yellow painted body, dark weathered steel tracks, glass cab, visible boom/stick hydraulic joints and a ground-facing bucket. Use sandstone composite, copper, dust-resistant glass and warm amber guide lighting with physically plausible PBR response. Do not depict discovered groundwater, restored rivers or field intervention as facts. Export clean UVs, PBR maps, LODs, semantic parts, GLB/glTF and provenance QA.`,
  ocean: `Create a premium 3D Ocean Blue Sentinel research-station diorama that preserves the existing ocean station function set: bathymetry/trench investigation, coastal and surface-water context, survey-priority planning and field verification. Show a sea-surface reference plane, robust instrument buoy with GNSS/weather/comms, an AUV with multibeam sonar and CTD payload, and a cutaway seabed/bathymetry base with route markers. Use clearly separated surface families: deep translucent ocean/water reference, brushed marine stainless steel and titanium instrument frames, dark anti-fouling composite and restrained teal/blue emissive navigation lines. Water must not look like painted metal, and the steel hardware must keep readable highlights. Clearly separate synthetic sandbox markers from measured observations. Export clean UVs, PBR maps, LODs, semantic parts, GLB/glTF and provenance QA.`,
  'earth-space': `Create a premium 3D Earth–Space Orbital Synthesis research interface/diorama, preserving the existing station functions without pretending it is a deployed orbital platform. Center a detailed Earth observation globe on an instrumented data plinth, surround it with restrained orbital context rings, a readable 8×8×8 analysis lattice for the 512-cell address system and a source-linked observation node representing JPL/SOHO evidence intake. Keep the globe visually Earth-like with blue ocean, green/brown land and white cloud/ice cues, while the support structure uses obsidian glass, anodized dark alloy and violet/cyan data filaments. Do not let the structural material overwrite the Earth surface. Keep the 512 lattice legible and avoid turning it into decorative noise. Export clean UVs, PBR maps, LODs, semantic parts, GLB/glTF and provenance QA.`,
}

function makeConfiguration(station: ResearchStationPreset, prompt: string): AssetConfiguration {
  return {
    track: 'terra-station',
    stationId: station.id,
    assetKind: 'station-shell',
    boardPreset: 'lab-ledcolor',
    piecePreset: 'earth-guardian',
    material: station.material,
    texture: station.texture,
    primaryColor: station.accent,
    secondaryColor: station.secondary,
    ledIntensity: 58,
    scaleMm: 500,
    prompt,
  }
}

function makeExcavatorConfiguration(station: ResearchStationPreset): AssetConfiguration {
  return {
    ...makeConfiguration(station, STATION_PROMPTS.sahara),
    material: 'Construction-yellow coated body + dark weathered steel tracks + glass cab',
    texture: 'Dust-worn construction coating with steel contrast and Sahara terrain context',
    primaryColor: '#d4a72c',
    secondaryColor: '#68747d',
    ledIntensity: 18,
    scaleMm: 500,
    prompt: 'Tracked Sahara terrain excavator concept with cab, tracks, articulated boom, stick, hydraulic joints and a ground-facing bucket. Keep the machine visibly separate from the terrain and research evidence.',
  }
}

function downloadText(filename: string, text: string, mimeType: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function ResearchStation3DWorkbench({ station }: { station: ResearchStationPreset }) {
  const [prompt, setPrompt] = useState(STATION_PROMPTS[station.id])
  const specification = useMemo(() => createAssetSpecification(makeConfiguration(station, prompt)), [station, prompt])
  const [bundle, setBundle] = useState(() => generateProceduralAssetBundle(createAssetSpecification(makeConfiguration(station, STATION_PROMPTS[station.id]))))
  const excavatorBundle = useMemo(() => station.id === 'sahara'
    ? generateSaharaExcavatorBundle(createAssetSpecification(makeExcavatorConfiguration(station)))
    : null, [station])
  const [message, setMessage] = useState('Model 3D stacji wygenerowany lokalnie z funkcjami przypisanymi do tego presetu.')
  const current = bundle.specificationId === specification.id

  function regenerate() {
    const next = generateProceduralAssetBundle(specification)
    setBundle(next)
    setMessage(`Wygenerowano ${next.preview.label}: ${next.metrics.vertices} wierzchołków, ${next.metrics.triangles} trójkątów, ${next.semanticParts.length} nazwanych modułów.`)
  }

  function downloadManifest() {
    downloadText(`${bundle.specificationId}-station-manifest.json`, JSON.stringify(proceduralAssetManifest(bundle), null, 2), 'application/json')
  }

  return <section className="card" aria-label={`${station.name} generated 3D station workbench`}>
    <div className="section-heading">
      <div><p className="eyebrow">OBRACALNY MODEL 3D · TEKSTURA · FUNKCJE STACJI</p><h3>{station.name} · model funkcjonalny</h3></div>
      <StatusBadge value={current ? '3D GLTF READY' : 'REGENERATE'} />
    </div>
    <p>Ten model jest generowaną koncepcją 3D opartą o funkcje wymienione dla stacji. Oryginalny interfejs badawczy pozostaje osobnym źródłem poniżej; model 3D nie jest zdjęciem ani dowodem wdrożonego sprzętu.</p>
    <div className="grid two">
      <div>
        <ProceduralAssetViewer bundle={bundle} stale={!current} />
        <p className="lab-note"><b>Moduły:</b> {bundle.semanticParts.map(part => part.name).join(' · ')}</p>
        <div className="toolbar">
          <button type="button" onClick={() => downloadText(bundle.model.filename, bundle.model.content, bundle.model.mimeType)}>Pobierz model .gltf</button>
          <button type="button" onClick={downloadManifest}>Pobierz manifest QA</button>
        </div>
      </div>
      <div>
        <label>Prompt modelowania i teksturowania
          <textarea rows={16} value={prompt} onChange={event => setPrompt(event.target.value)} />
        </label>
        <button type="button" onClick={regenerate}>Wygeneruj ponownie model stacji</button>
        <p role="status" className="lab-note">{message}</p>
        <dl className="station-facts">
          <div><dt>Materiał</dt><dd>{station.material}</dd></div>
          <div><dt>Tekstura</dt><dd>{station.texture}</dd></div>
          <div><dt>Źródła</dt><dd>{station.sources.join(' · ')}</dd></div>
          <div><dt>Granica prawdy</dt><dd>{station.truthBoundary}</dd></div>
        </dl>
      </div>
    </div>

    {excavatorBundle ? <div className="grid two">
      <div>
        <div className="section-heading"><div><p className="eyebrow">SAHARA · TEREN · STAL · RUCHOME RAMIĘ</p><h3>Koparka terenowa 3D</h3></div><StatusBadge value={excavatorBundle.qa.result} /></div>
        <ProceduralAssetViewer bundle={excavatorBundle} />
      </div>
      <div>
        <p>Osobny model ma gąsienice, obrotnicę, kabinę, przeciwwagę, wysięgnik, ramię, widoczne przeguby hydrauliczne i łyżkę skierowaną do terenu. Żółta powłoka konstrukcyjna i ciemna stal są celowo oddzielone od znaczenia danych terenowych.</p>
        <p className="lab-note"><b>Granica prawdy:</b> to wygenerowany asset wizualizacyjny sprzętu terenowego. Nie oznacza, że koparka została wysłana na Saharę ani że wykonano wykop.</p>
        <div className="toolbar"><button type="button" onClick={() => downloadText(excavatorBundle.model.filename, excavatorBundle.model.content, excavatorBundle.model.mimeType)}>Pobierz koparkę .gltf</button></div>
      </div>
    </div> : null}
  </section>
}
