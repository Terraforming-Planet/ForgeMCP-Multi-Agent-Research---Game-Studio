import { useEffect, useMemo, useState } from 'react'
import { OWNER_CUBE_PROMPTS } from '../data/ownerCubePipeline'
import { createAssetSpecification, type AssetConfiguration, type PiecePreset } from '../integrations/commerce/productLab'
import {
  buildOwnerReferenceProfile,
  calibrateOwnerReferenceConfiguration,
  type OwnerAssetInput,
  type OwnerReferenceProfile,
} from '../integrations/cube/ownerAssetIntake'
import { applyOwnerReferenceToPremiumBundle, type OwnerReferenceGenerationResult } from '../integrations/cube/ownerReferenceGenerator'
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

function makeManifest(bundle: PremiumCubeAssetBundle, profile: OwnerReferenceProfile | null, applied: OwnerReferenceGenerationResult['reference'] | null) {
  return {
    schema: profile ? 'forgemcp.cube-premium-owner-reference-v3.v1' : 'forgemcp.cube-premium-model-v2.v1',
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
    ownerReferenceProfile: profile ? {
      status: profile.status,
      manifestSha256: profile.manifestSha256,
      calibration: profile.calibration,
      applied,
    } : null,
    metrics: bundle.metrics,
    semanticParts: bundle.semanticParts,
    qa: bundle.qa,
    truthBoundary: bundle.truthBoundary,
  }
}

function ownerStatus(profile: OwnerReferenceProfile | null) {
  if (!profile) return 'NO OWNER FILES'
  if (profile.status === 'OWNER_REFERENCE_READY') return 'OWNER REFERENCE READY'
  if (profile.status === 'OWNER_REFERENCE_PARTIAL') return 'OWNER FILES PARTIAL'
  return 'NO SUPPORTED REFERENCE'
}

export function CubePremiumModelLabV2() {
  const initialPiece = PIECES[4]
  const initialPrompt = OWNER_CUBE_PROMPTS.find(item => item.id === initialPiece.id)?.prompt ?? 'Create a premium knight.'
  const [pieceId, setPieceId] = useState<PieceId>(initialPiece.id)
  const [primaryColor, setPrimaryColor] = useState(initialPiece.primary)
  const [secondaryColor, setSecondaryColor] = useState(initialPiece.secondary)
  const [ledIntensity, setLedIntensity] = useState(58)
  const [prompt, setPrompt] = useState(initialPrompt)
  const [ownerInputs, setOwnerInputs] = useState<OwnerAssetInput[]>([])
  const [ownerProfile, setOwnerProfile] = useState<OwnerReferenceProfile | null>(null)
  const [ownerApplied, setOwnerApplied] = useState<OwnerReferenceGenerationResult['reference'] | null>(null)
  const [ownerMessage, setOwnerMessage] = useState('Paczka SwissTransfer nie jest pobierana automatycznie. Wskaż lokalne pliki właściciela, aby użyć ich jako prywatnego profilu odniesienia.')
  const [bundle, setBundle] = useState(() => generatePremiumCubeAssetBundle(createAssetSpecification(makeConfiguration(initialPiece.id, initialPiece.primary, initialPiece.secondary, 58, initialPrompt))))
  const [message, setMessage] = useState('Koń Premium V2 wygenerowany z geometrią i mapami PBR wynikającymi z kontraktu treningowego właściciela.')

  const baseConfiguration = useMemo(
    () => makeConfiguration(pieceId, primaryColor, secondaryColor, ledIntensity, prompt),
    [pieceId, primaryColor, secondaryColor, ledIntensity, prompt],
  )
  const calibratedConfiguration = useMemo(
    () => ownerProfile && ownerProfile.status !== 'NO_SUPPORTED_REFERENCE'
      ? calibrateOwnerReferenceConfiguration(baseConfiguration, ownerProfile, pieceId)
      : baseConfiguration,
    [baseConfiguration, ownerProfile, pieceId],
  )
  const specification = useMemo(() => createAssetSpecification(calibratedConfiguration), [calibratedConfiguration])
  const current = specification.id === bundle.specificationId

  function selectPiece(id: PieceId) {
    const piece = PIECES.find(item => item.id === id) ?? PIECES[4]
    setPieceId(id)
    setPrimaryColor(piece.primary)
    setSecondaryColor(piece.secondary)
    setPrompt(OWNER_CUBE_PROMPTS.find(item => item.id === id)?.prompt ?? `Create a premium ${id}.`)
    setMessage(`${piece.label} wybrany. Naciśnij generowanie, aby przebudować geometrię V2 i komplet PBR${ownerProfile ? ' z aktywnym profilem właściciela' : ''}.`)
  }

  async function loadOwnerFiles(files: FileList | null) {
    const list = Array.from(files ?? [])
    if (!list.length) {
      setOwnerInputs([])
      setOwnerProfile(null)
      setOwnerApplied(null)
      setOwnerMessage('Nie wybrano plików. Generator wrócił do bezpiecznego Premium V2 fallback.')
      return
    }
    try {
      setOwnerMessage(`Analizuję lokalnie ${list.length} plików: model, bounds, topologię, mapy PBR i SHA-256…`)
      const inputs: OwnerAssetInput[] = await Promise.all(list.map(async file => ({
        name: file.name,
        mimeType: file.type || (file.name.toLowerCase().endsWith('.png') ? 'image/png' : 'application/octet-stream'),
        bytes: new Uint8Array(await file.arrayBuffer()),
      })))
      const profile = await buildOwnerReferenceProfile(inputs)
      setOwnerInputs(inputs)
      setOwnerProfile(profile)
      setOwnerApplied(null)
      setOwnerMessage(`Profil ${profile.status}: ${profile.models.length} modeli, ${profile.textures.length} tekstur, PBR ${profile.calibration.pbrCoverage}/4, target ≥ ${profile.calibration.targetTriangleFloor.toLocaleString('pl-PL')} trójkątów. Manifest ${profile.manifestSha256.slice(0, 16)}…`)
    } catch (error) {
      setOwnerInputs([])
      setOwnerProfile(null)
      setOwnerApplied(null)
      setOwnerMessage(`Nie udało się przeanalizować lokalnych plików: ${error instanceof Error ? error.message : 'unknown error'}. Nic nie zostało wysłane do sieci.`)
    }
  }

  function regenerate() {
    let next = generatePremiumCubeAssetBundle(specification)
    let applied: OwnerReferenceGenerationResult['reference'] | null = null
    if (ownerProfile && ownerInputs.length && ownerProfile.status !== 'NO_SUPPORTED_REFERENCE') {
      const result = applyOwnerReferenceToPremiumBundle(next, ownerInputs, ownerProfile, pieceId)
      next = result.bundle
      applied = result.reference
    }
    setOwnerApplied(applied)
    setBundle(next)
    const ownerText = applied
      ? ` Owner reference: ${applied.modelName ?? 'texture-only'}, proporcje x/z ×${applied.widthDepthScale.toFixed(3)}, mapy właściciela ${applied.textureOverrides.length}.`
      : ''
    setMessage(`Wygenerowano ${next.preview.label}: ${next.metrics.vertices.toLocaleString('pl-PL')} wierzchołków, ${next.metrics.triangles.toLocaleString('pl-PL')} trójkątów, 4 mapy PBR, ${next.semanticParts.length} części semantycznych. QA: ${next.qa.result}.${ownerText}`)
  }

  return <section className="card cube-premium-model-v2" aria-label="Cube Premium training-driven 3D Modeler V2">
    <div className="section-heading">
      <div>
        <p className="eyebrow">CHESSARENA TRAINING RULES + OWNER REFERENCE → REAL GEOMETRY + PBR</p>
        <h2>Modeler 3D figurek Premium V2 + Owner Reference V3</h2>
      </div>
      <StatusBadge value={current ? 'V2/V3 READY' : 'REGENERATE'} />
    </div>
    <p>Ten wariant implementuje w kodzie zasady z prywatnego, zatwierdzonego przez właściciela programu Premium Full Game V3: rozpoznawalność figur, normalizację podstawy/skali, gęstszą geometrię i zestaw PBR <b>BaseColor + Normal + ORM + Emissive</b>. Po wskazaniu Twoich lokalnych modeli generator dodatkowo kalibruje proporcje do realnego GLB/glTF/OBJ oraz może osadzić właścicielskie mapy PNG bez publikowania źródeł.</p>
    <p className="lab-note"><b>Granica prawdy:</b> link SwissTransfer nadal nie jest dostępny z serwera ForgeMCP. Import poniżej działa na plikach wskazanych przez właściciela w przeglądarce i nie wysyła ich do GitHuba ani API. Nie twierdzimy też, że działa generatywny checkpoint 3D — V2/V3 jest deterministycznym modelerem sterowanym kontraktem treningowym i profilem referencyjnym.</p>

    <div className="card" aria-label="Owner asset intake">
      <div className="section-heading">
        <div><p className="eyebrow">OWNER ASSET INTAKE · LOCAL ONLY</p><h3>Dodaj swoje modele 3D i tekstury jako aktywny profil odniesienia</h3></div>
        <StatusBadge value={ownerStatus(ownerProfile)} />
      </div>
      <label>Pliki właściciela: GLB, glTF, OBJ, FBX/Blend do inwentaryzacji oraz PNG/JPG/WebP/TGA tekstur
        <input
          aria-label="Owner model and texture files"
          type="file"
          multiple
          accept=".glb,.gltf,.obj,.fbx,.blend,.png,.jpg,.jpeg,.webp,.tga,image/png,image/jpeg,image/webp"
          onChange={event => void loadOwnerFiles(event.currentTarget.files)}
        />
      </label>
      <p role="status" className="lab-note">{ownerMessage}</p>
      {ownerProfile ? <div className="lab-metrics">
        <article><b>{ownerProfile.models.length}</b><span>modeli</span></article>
        <article><b>{ownerProfile.textures.length}</b><span>tekstur</span></article>
        <article><b>{ownerProfile.calibration.sourceTriangles?.toLocaleString('pl-PL') ?? '—'}</b><span>trójkątów referencji</span></article>
        <article><b>{ownerProfile.calibration.pbrCoverage}/4</b><span>pokrycie PBR</span></article>
      </div> : null}
      {ownerProfile?.models.length ? <details><summary>Modele rozpoznane w paczce</summary><ul>{ownerProfile.models.map(model => <li key={`${model.sha256}-${model.name}`}><b>{model.name}</b> · {model.format.toUpperCase()} · rola {model.inferredRole} · {model.vertices?.toLocaleString('pl-PL') ?? 'n/a'} vertices · {model.triangles?.toLocaleString('pl-PL') ?? 'n/a'} triangles · {model.parseStatus}</li>)}</ul></details> : null}
      {ownerProfile?.textures.length ? <details><summary>Tekstury rozpoznane w paczce</summary><ul>{ownerProfile.textures.map(texture => <li key={`${texture.sha256}-${texture.name}`}><b>{texture.name}</b> · {texture.role} · {texture.inferredPieceRole} · {texture.browserEmbeddable ? 'browser-ready' : 'inventory-only'}</li>)}</ul></details> : null}
      {ownerApplied ? <p className="lab-note"><b>Zastosowano:</b> {ownerApplied.modelName ?? 'profil tekstur'} · kalibracja geometrii {ownerApplied.geometryCalibrated ? 'TAK' : 'NIE'} · x/z ×{ownerApplied.widthDepthScale.toFixed(3)} · mapy właściciela: {ownerApplied.textureOverrides.map(item => `${item.role}:${item.filename}`).join(', ') || 'brak kompatybilnych PNG'}. {ownerApplied.warnings.join(' ')}</p> : null}
    </div>

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
        <button type="button" onClick={regenerate}>{ownerProfile ? 'Generuj V3 na podstawie modeli właściciela' : 'Generuj Premium V2 + 4 mapy PBR'}</button>
        <p role="status" className="lab-note">{message}</p>
        <h3>Co poprawia V3 po dodaniu Twoich plików</h3>
        <ul>
          <li>czyta realne bounds i proporcje referencyjnego GLB/glTF/OBJ zamiast zgadywać rozmiar;</li>
          <li>dopasowuje skalę docelową i szerokość/głębokość w bezpiecznym zakresie ±18%, żeby nadal zmieścić figurę na polu;</li>
          <li>porównuje gęstość referencji z limitem runtime 30 000 trójkątów i zapisuje detail target w specyfikacji;</li>
          <li>rozpoznaje BaseColor, Normal, ORM i Emissive po plikach oraz materiale glTF;</li>
          <li>kompatybilne mapy PNG właściciela są osadzane bezpośrednio w eksportowanym glTF;</li>
          <li>każdy lokalny plik dostaje SHA-256, a cały zestaw wspólny manifest SHA-256.</li>
        </ul>
        <div className="toolbar">
          <button type="button" onClick={() => download(bundle.model.filename, bundle.model.content, bundle.model.mimeType)}>Pobierz model Premium V2/V3 .gltf</button>
          <button type="button" onClick={() => download(`${bundle.specificationId}-premium-v3-manifest.json`, JSON.stringify(makeManifest(bundle, ownerProfile, ownerApplied), null, 2), 'application/json')}>Pobierz manifest V3</button>
        </div>
      </div>
    </div>
  </section>
}
