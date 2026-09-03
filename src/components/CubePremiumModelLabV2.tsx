import { useEffect, useMemo, useState } from 'react'
import { OWNER_CUBE_PROMPTS } from '../data/ownerCubePipeline'
import { createAssetSpecification, type AssetConfiguration, type PiecePreset } from '../integrations/commerce/productLab'
import { generatePremiumCubeAssetBundle, type PremiumCubeAssetBundle } from '../integrations/cube/premiumGeometryV2'
import { ProceduralAssetViewer } from './ProceduralAssetViewer'
import { StatusBadge } from './StatusBadge'

type PieceId = 'king' | 'queen' | 'bishop' | 'rook' | 'knight' | 'pawn'

const PIECES: Array<{ id: PieceId; label: string; preset: PiecePreset; primary: string; secondary: string }> = [
  { id: 'king', label: 'Król Premium V2', preset: 'czech-facet', primary: '#1d2636', secondary: '#56ddff' },
  { id: 'queen', label: 'Hetman Premium V2', preset: 'czech-facet', primary: '#302645', secondary: '#a77bff' },
  { id: 'bishop', label: 'Goniec Premium V2', preset: 'czech-facet', primary: '#27324b', secondary: '#35f0a1' },
  { id: 'rook', label: 'Wieża Premium V2', preset: 'czech-facet', primary: '#202a3c', secondary: '#5de4ff' },
  { id: 'knight', label: 'Koń Premium V2 · priorytet', preset: 'lab-ledcolor', primary: '#262b36', secondary: '#ff54d8' },
  { id: 'pawn', label: 'Pion Premium V2', preset: 'classic', primary: '#d8e2f3', secondary: '#5de4ff' },
]

function makeConfiguration(pieceId: PieceId, primaryColor: string, secondaryColor: string, ledIntensity: number, prompt: string): AssetConfiguration {
  const piece = PIECES.find(item => item.id === pieceId) ?? PIECES[4]
  return {
    track: 'cube-asset',
    stationId: 'earth-space',
    assetKind: 'figurine',
    boardPreset: pieceId === 'pawn' ? 'classic-mono' : 'lab-ledcolor',
    piecePreset: piece.preset,
    material: 'Premium V2 owner-training profile: weighted Staunton geometry + PBR baseColor/normal/ORM/emissive',
    texture: 'Four-map PBR prototype: baseColor, tangent-space normal, packed AO/roughness/metallic and emissive mask',
    primaryColor,
    secondaryColor,
    ledIntensity,
    scaleMm: pieceId === 'king' ? 125 : pieceId === 'queen' ? 118 : pieceId === 'pawn' ? 88 : 108,
    prompt,
  }
}

function mapUrl(bytes: Uint8Array, mimeType = 'image/png') {
  return URL.createObjectURL(new Blob([Uint8Array.from(bytes).buffer], { type: mimeType }))
}

function PbrMapPreview({ bundle, mapName }: { bundle: PremiumCubeAssetBundle; mapName: 'baseColor' | 'normal' | 'orm' | 'emissive' }) {
  const bytes = mapName === 'baseColor' ? bundle.texture.bytes : bundle.pbrMaps[mapName].bytes
  const url = useMemo(() => mapUrl(bytes), [bytes])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  return <figure className="premium-pbr-map"><img src={url} alt={`${bundle.preview.label} ${mapName} texture map`} /><figcaption>{mapName}</figcaption></figure>
}

function download(filename: string, content: string | Uint8Array, mimeType: string) {
  const part: BlobPart = typeof content === 'string' ? content : Uint8Array.from(content).buffer
  const url = URL.createObjectURL(new Blob([part], { type: mimeType }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function makeManifest(bundle: PremiumCubeAssetBundle) {
  return {
    schema: 'forgemcp.cube-premium-model-v2.v1',
    trainingProfile: bundle.trainingProfile,
    pieceRole: bundle.pieceRole,
    specificationId: bundle.specificationId,
    geometryFingerprint: bundle.geometryFingerprint,
    baseColorFingerprint: bundle.textureFingerprint,
    pbrMaps: {
      normal: bundle.pbrMaps.normal.fingerprint,
      orm: bundle.pbrMaps.orm.fingerprint,
      emissive: bundle.pbrMaps.emissive.fingerprint,
    },
    metrics: bundle.metrics,
    semanticParts: bundle.semanticParts,
    qa: bundle.qa,
    truthBoundary: bundle.truthBoundary,
  }
}

export function CubePremiumModelLabV2() {
  const initialPiece = PIECES[4]
  const initialPrompt = OWNER_CUBE_PROMPTS.find(item => item.id === initialPiece.id)?.prompt ?? 'Create a premium knight.'
  const [pieceId, setPieceId] = useState<PieceId>(initialPiece.id)
  const [primaryColor, setPrimaryColor] = useState(initialPiece.primary)
  const [secondaryColor, setSecondaryColor] = useState(initialPiece.secondary)
  const [ledIntensity, setLedIntensity] = useState(58)
  const [prompt, setPrompt] = useState(initialPrompt)
  const [bundle, setBundle] = useState(() => generatePremiumCubeAssetBundle(createAssetSpecification(makeConfiguration(initialPiece.id, initialPiece.primary, initialPiece.secondary, 58, initialPrompt))))
  const [message, setMessage] = useState('Koń Premium V2 wygenerowany z geometrią i mapami PBR wynikającymi z kontraktu treningowego właściciela.')

  const specification = useMemo(() => createAssetSpecification(makeConfiguration(pieceId, primaryColor, secondaryColor, ledIntensity, prompt)), [pieceId, primaryColor, secondaryColor, ledIntensity, prompt])
  const current = specification.id === bundle.specificationId

  function selectPiece(id: PieceId) {
    const piece = PIECES.find(item => item.id === id) ?? PIECES[4]
    setPieceId(id)
    setPrimaryColor(piece.primary)
    setSecondaryColor(piece.secondary)
    setPrompt(OWNER_CUBE_PROMPTS.find(item => item.id === id)?.prompt ?? `Create a premium ${id}.`)
    setMessage(`${piece.label} wybrany. Naciśnij generowanie, aby przebudować geometrię V2 i komplet PBR.`)
  }

  function regenerate() {
    const next = generatePremiumCubeAssetBundle(specification)
    setBundle(next)
    setMessage(`Wygenerowano ${next.preview.label}: ${next.metrics.vertices.toLocaleString('pl-PL')} wierzchołków, ${next.metrics.triangles.toLocaleString('pl-PL')} trójkątów, 4 mapy PBR, ${next.semanticParts.length} części semantycznych. QA: ${next.qa.result}.`)
  }

  return <section className="card cube-premium-model-v2" aria-label="Cube Premium training-driven 3D Modeler V2">
    <div className="section-heading">
      <div>
        <p className="eyebrow">CHESSARENA TRAINING RULES → REAL GEOMETRY + PBR</p>
        <h2>Modeler 3D figurek Premium V2</h2>
      </div>
      <StatusBadge value={current ? 'V2 PBR READY' : 'REGENERATE'} />
    </div>
    <p>To nie jest już tylko lepszy prompt. Ten wariant implementuje w kodzie zasady z prywatnego, zatwierdzonego przez właściciela programu Premium Full Game V3: rozpoznawalność figur, normalizację podstawy/skali, więcej geometrii oraz prawdziwy zestaw PBR <b>BaseColor + Normal + ORM + Emissive</b>.</p>
    <p className="lab-note"><b>Granica prawdy:</b> korzystamy z reguł i metodologii treningowej, ale nie twierdzimy, że w przeglądarce działa wytrenowany generatywny checkpoint 3D. Model V2 jest deterministycznie generowany z tych reguł i przechodzi jawne QA.</p>

    <div className="toolbar" aria-label="Wybór figury Premium V2">
      {PIECES.map(piece => <button type="button" key={piece.id} aria-pressed={pieceId === piece.id} onClick={() => selectPiece(piece.id)}>{piece.label}</button>)}
    </div>

    <div className="grid two">
      <div>
        <ProceduralAssetViewer bundle={bundle} stale={!current} />
        <div className="lab-metrics">
          <article><b>{bundle.metrics.vertices.toLocaleString('pl-PL')}</b><span>wierzchołków</span></article>
          <article><b>{bundle.metrics.triangles.toLocaleString('pl-PL')}</b><span>trójkątów</span></article>
          <article><b>4</b><span>mapy PBR</span></article>
          <article><b>{bundle.semanticParts.length}</b><span>części semantycznych</span></article>
        </div>
        <div className="premium-pbr-map-grid">
          <PbrMapPreview bundle={bundle} mapName="baseColor" />
          <PbrMapPreview bundle={bundle} mapName="normal" />
          <PbrMapPreview bundle={bundle} mapName="orm" />
          <PbrMapPreview bundle={bundle} mapName="emissive" />
        </div>
      </div>
      <div>
        <label>Prompt produkcyjny
          <textarea rows={14} value={prompt} onChange={event => setPrompt(event.target.value)} />
        </label>
        <div className="grid two">
          <label>Kolor materiału <input type="color" value={primaryColor} onChange={event => setPrimaryColor(event.target.value)} /></label>
          <label>Kolor LED / emissive <input type="color" value={secondaryColor} onChange={event => setSecondaryColor(event.target.value)} /></label>
        </div>
        <label>Intensywność LED: {ledIntensity}% <input type="range" min="0" max="100" value={ledIntensity} onChange={event => setLedIntensity(Number(event.target.value))} /></label>
        <button type="button" onClick={regenerate}>Generuj Premium V2 + 4 mapy PBR</button>
        <p role="status" className="lab-note">{message}</p>
        <h3>Co poprawiono względem starego generatora</h3>
        <ul>
          <li>profile obrotowe Staunton zamiast korpusu z kilku prostych cylindrów;</li>
          <li>48–52 segmenty na bryłach obrotowych i gęstsze głowy/krzywizny;</li>
          <li>koń: pierś + ciągła masa szyi S, osobny czerep, policzek, pysk, szczęka, oczy, nozdrza, dwa mniejsze uszy i grzywa podążająca za karkiem;</li>
          <li>wieża: osiem czytelnych blanków; hetman: głęboka ośmiopunktowa korona; goniec: rozdzielona mitra;</li>
          <li>osobna Normal mapa, packed ORM i Emissive zamiast samego BaseColor ze stałym roughness/metallic.</li>
        </ul>
        <div className="toolbar">
          <button type="button" onClick={() => download(bundle.model.filename, bundle.model.content, bundle.model.mimeType)}>Pobierz model Premium V2 .gltf</button>
          <button type="button" onClick={() => download(`${bundle.specificationId}-premium-v2-manifest.json`, JSON.stringify(makeManifest(bundle), null, 2), 'application/json')}>Pobierz manifest V2</button>
        </div>
      </div>
    </div>
  </section>
}
