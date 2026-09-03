import { useMemo, useState } from 'react'
import { DEFAULT_BASIC_GAME_PROMPT, generateBasicGameBlueprint } from '../game/basicGameGenerator'
import { OWNER_CUBE_PROMPTS } from '../data/ownerCubePipeline'
import { createAssetSpecification, type AssetConfiguration, type PiecePreset } from '../integrations/commerce/productLab'
import { generateProceduralAssetBundle, proceduralAssetManifest, type ProceduralAssetBundle } from '../integrations/commerce/proceduralAssets'
import { ProceduralAssetViewer } from './ProceduralAssetViewer'
import { StatusBadge } from './StatusBadge'

type PieceId = 'king' | 'queen' | 'bishop' | 'rook' | 'knight' | 'pawn'

type GeneratedPack = {
  blueprint: ReturnType<typeof generateBasicGameBlueprint>
  board: ProceduralAssetBundle
  pieces: Record<PieceId, ProceduralAssetBundle>
}

const PIECES: PieceId[] = ['king', 'queen', 'bishop', 'rook', 'knight', 'pawn']

function piecePresetForFamily(family: ReturnType<typeof generateBasicGameBlueprint>['pieceFamily']): PiecePreset {
  if (family === 'classic-staunton') return 'classic'
  if (family === 'earth-guardian') return 'earth-guardian'
  if (family === 'lab-ledcolor' || family === 'crayon-cathedral') return 'lab-ledcolor'
  return 'czech-facet'
}

function makeBoardConfiguration(blueprint: ReturnType<typeof generateBasicGameBlueprint>): AssetConfiguration {
  return {
    track: 'cube-asset',
    stationId: 'earth-space',
    assetKind: 'board',
    boardPreset: blueprint.theme.boardPreset,
    piecePreset: 'czech-facet',
    material: blueprint.theme.boardPreset === 'classic-mono' ? 'Premium monochrome stone / ebonized tournament material' : 'Dark composite with recessed emissive channels',
    texture: `${blueprint.theme.label} · PBR checker surface · accent ${blueprint.theme.accent} · secondary ${blueprint.theme.secondary}`,
    primaryColor: blueprint.theme.accent.startsWith('#') ? blueprint.theme.accent : '#56ddff',
    secondaryColor: blueprint.theme.secondary.startsWith('#') ? blueprint.theme.secondary : '#35f0a1',
    ledIntensity: blueprint.theme.boardPreset === 'classic-mono' ? 0 : 65,
    scaleMm: 500,
    prompt: `Generate the playable board for ${blueprint.title}. ${blueprint.theme.summary} Keep exact 8x8 playable geometry and preserve the generated blueprint id ${blueprint.id}.`,
  }
}

function makePieceConfiguration(blueprint: ReturnType<typeof generateBasicGameBlueprint>, piece: PieceId): AssetConfiguration {
  const ownerPrompt = OWNER_CUBE_PROMPTS.find(item => item.id === piece)?.prompt ?? `Create a recognizable ${piece} chess piece.`
  const familyPreset = piecePresetForFamily(blueprint.pieceFamily)
  const preset = piece === 'knight' && blueprint.pieceFamily !== 'classic-staunton' ? 'lab-ledcolor' : familyPreset
  return {
    track: 'cube-asset',
    stationId: 'earth-space',
    assetKind: 'figurine',
    boardPreset: blueprint.theme.boardPreset,
    piecePreset: preset,
    material: blueprint.pieceFamily === 'classic-staunton' ? 'Tournament stone/resin PBR' : 'Premium faceted resin/composite PBR with controlled emissive inlay',
    texture: `${blueprint.theme.label} theme · consistent set texel density · separate LED mask`,
    primaryColor: blueprint.theme.accent.startsWith('#') ? blueprint.theme.accent : '#56ddff',
    secondaryColor: blueprint.theme.secondary.startsWith('#') ? blueprint.theme.secondary : '#35f0a1',
    ledIntensity: blueprint.theme.boardPreset === 'classic-mono' ? 0 : 55,
    scaleMm: piece === 'king' ? 125 : piece === 'queen' ? 118 : piece === 'pawn' ? 86 : 108,
    prompt: `${ownerPrompt}\n\nGAME PACK THEME: ${blueprint.theme.summary} Keep this ${piece} visually consistent with piece family ${blueprint.pieceFamily} and blueprint ${blueprint.id}.`,
  }
}

function generatePack(prompt: string): GeneratedPack {
  const blueprint = generateBasicGameBlueprint({ prompt, preset: 'auto', opponent: 'auto' })
  const board = generateProceduralAssetBundle(createAssetSpecification(makeBoardConfiguration(blueprint)))
  const pieces = Object.fromEntries(PIECES.map(piece => [piece, generateProceduralAssetBundle(createAssetSpecification(makePieceConfiguration(blueprint, piece))) ])) as Record<PieceId, ProceduralAssetBundle>
  return { blueprint, board, pieces }
}

function downloadText(filename: string, content: string, mimeType: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function BasicGame3DGenerator() {
  const [prompt, setPrompt] = useState(`${DEFAULT_BASIC_GAME_PROMPT} with premium Staunton pieces versus computer`)
  const [pack, setPack] = useState(() => generatePack(`${DEFAULT_BASIC_GAME_PROMPT} with premium Staunton pieces versus computer`))
  const [selectedPiece, setSelectedPiece] = useState<PieceId>('knight')
  const previewPiece = pack.pieces[selectedPiece]
  const packManifest = useMemo(() => ({
    schema: 'forgemcp.basic-game-3d-pack.v1',
    generatedLocally: true,
    blueprint: pack.blueprint,
    board: proceduralAssetManifest(pack.board),
    pieces: Object.fromEntries(PIECES.map(piece => [piece, proceduralAssetManifest(pack.pieces[piece])])),
    truthBoundary: 'This package contains deterministic local procedural 3D preview assets and a playable Capture Chess blueprint. It is not a claim that the owner high-detail archive has been imported or that these procedural meshes are final production art.',
  }), [pack])

  function regenerate() {
    setPack(generatePack(prompt))
  }

  return <section className="card" aria-label="Basic Game 3D Pack Generator">
    <div className="section-heading">
      <div><p className="eyebrow">PROMPT → GAME BLUEPRINT + 3D BOARD + 6 PIECES + TEXTURE QA</p><h2>Generator podstawowej gry z pakietem 3D</h2></div>
      <StatusBadge value="LOCAL 3D PACK READY" />
    </div>
    <p>Ta część łączy generator gry z tym samym lokalnym eksporterem 3D, zamiast kończyć na planszy 2D. Wygenerowany blueprint nadal korzysta z bezpiecznego, deterministycznego szablonu Capture Chess.</p>
    <label>Opis gry, wyglądu i przeciwnika
      <textarea rows={5} value={prompt} onChange={event => setPrompt(event.target.value)} />
    </label>
    <div className="toolbar">
      <button type="button" onClick={regenerate}>Wygeneruj podstawową grę + pakiet 3D</button>
      <button type="button" onClick={() => downloadText(`${pack.blueprint.id}-3d-pack.json`, JSON.stringify(packManifest, null, 2), 'application/json')}>Pobierz manifest całej gry</button>
    </div>

    <div className="lab-metrics">
      <article><b>{pack.blueprint.id}</b><span>wersjonowany blueprint</span></article>
      <article><b>{pack.blueprint.pieceFamily}</b><span>rodzina figur</span></article>
      <article><b>{pack.blueprint.opponent}</b><span>przeciwnik</span></article>
      <article><b>7</b><span>assetów 3D: plansza + 6 typów figur</span></article>
    </div>

    <div className="grid two">
      <div>
        <h3>Plansza 3D</h3>
        <ProceduralAssetViewer bundle={pack.board} />
        <div className="toolbar"><button type="button" onClick={() => downloadText(pack.board.model.filename, pack.board.model.content, pack.board.model.mimeType)}>Pobierz planszę .gltf</button></div>
      </div>
      <div>
        <h3>Figury 3D</h3>
        <div className="toolbar" aria-label="Wybór figury z pakietu 3D">{PIECES.map(piece => <button type="button" key={piece} aria-pressed={selectedPiece === piece} onClick={() => setSelectedPiece(piece)}>{piece}</button>)}</div>
        <ProceduralAssetViewer bundle={previewPiece} />
        <div className="toolbar"><button type="button" onClick={() => downloadText(previewPiece.model.filename, previewPiece.model.content, previewPiece.model.mimeType)}>Pobierz {selectedPiece} .gltf</button></div>
      </div>
    </div>
    <p className="lab-note"><b>Granica jakości:</b> te modele są faktycznie generowane i eksportowalne, ale pozostają proceduralnymi assetami testowymi. Docelowe modele właściciela z paczki SwissTransfer powinny je zastąpić dopiero po imporcie, hashach, UV/PBR QA i podglądzie.</p>
  </section>
}
