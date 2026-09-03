import { useMemo, useState, type CSSProperties } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import earthFigurineConcept from '../assets/earth-figurine-concept.webp'
import { getResearchStationPreset, RESEARCH_STATION_PRESETS, type ResearchStationPresetId } from '../data/researchStations'
import { runCubeTrainingWorkflow } from '../coordinator/workflows'
import type { WorkflowRun } from '../types/core'
import { StationConceptVisual } from './StationConceptVisual'
import { StatusBadge } from './StatusBadge'
import { MiniChessGame } from './MiniChessGame'
import { LiveProjectFrame } from './LiveProjectFrame'
import { ProceduralAssetViewer } from './ProceduralAssetViewer'
import { PlayableStationWorlds } from './PlayableStationWorlds'
import { createAssetSpecification } from '../integrations/commerce/productLab'
import { generateProceduralAssetBundle } from '../integrations/commerce/proceduralAssets'

const CUBE_URL = 'https://teslaeco.github.io/Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer/'
const CUBE_PR_135 = 'https://github.com/teslaeco/Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer/pull/135'
const CUBE_PR_126 = 'https://github.com/teslaeco/Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer/pull/126'
const CUBE_PR_101 = 'https://github.com/teslaeco/Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer/pull/101'
const CUBE_PR_102 = 'https://github.com/teslaeco/Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer/pull/102'
const VISUAL_DATASET = 'https://huggingface.co/datasets/8Planetterraforming/ChessArena512AI-Visual-Compliance-Dataset'

type BoardId = 'cube-512' | 'classic-mono' | 'lab-ledcolor' | 'station-arena'
type PieceId = 'forgemcp-premium' | 'crayon-cathedral' | 'classic-staunton' | 'earth-guardian'

const BOARD_PRESETS: Array<{ id: BoardId; name: string; geometry: string; status: string; note: string }> = [
  { id: 'cube-512', name: 'Cube Chess 512', geometry: '8×8×8 · 512 cells', status: 'LIVE ENGINE', note: 'Forge executes a pinned rules engine; this preview shows one selected level.' },
  { id: 'classic-mono', name: 'Classic Black & White', geometry: '8×8 · classic', status: 'LIVE · PR #135 MERGED', note: 'The Classic Black & White theme is now merged and deployed in the upstream Cube project.' },
  { id: 'lab-ledcolor', name: 'Lab LEDColor', geometry: '8×8 · configurable light', status: 'LIVE · PR #135 MERGED', note: 'Lab LEDColor controls and the ForgeMCP Premium name are now merged and deployed upstream.' },
  { id: 'station-arena', name: 'Research Station Arena', geometry: '8×8 visual prototype', status: 'FORGEMCP PREVIEW', note: 'A reversible station-derived material and colour preview; it does not mutate Cube upstream.' },
]

const PIECE_PRESETS: Array<{ id: PieceId; name: string; status: string }> = [
  { id: 'forgemcp-premium', name: 'ForgeMCP Premium Facet', status: 'SOURCE THEME' },
  { id: 'crayon-cathedral', name: 'Crayon Cathedral', status: 'SOURCE THEME' },
  { id: 'classic-staunton', name: 'Refined Staunton', status: 'UPSTREAM PR #126' },
  { id: 'earth-guardian', name: 'Earth Guardian', status: 'GENERATED CONCEPT' },
]

const PIECES = ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜', ...Array(8).fill('♟'), ...Array(32).fill(''), ...Array(8).fill('♙'), '♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']

type TournamentView = {
  candidate?: { id?: string }
  tournament?: {
    status?: string
    gamesCompleted?: number
    wins?: number
    draws?: number
    losses?: number
    illegalMoves?: number
    moveDiversity?: number
    checkmates?: number
  }
  proposedAction?: string
}

function BoardPreview({ boardId, pieceId, stationId, level, light }: { boardId: BoardId; pieceId: PieceId; stationId: ResearchStationPresetId; level: string; light: number }) {
  const station = getResearchStationPreset(stationId)
  const board = BOARD_PRESETS.find(item => item.id === boardId) ?? BOARD_PRESETS[0]
  const palette = boardId === 'classic-mono'
    ? { dark: '#101116', light: '#e8e8df', accent: '#54ffd1', secondary: '#52a8ff' }
    : boardId === 'lab-ledcolor'
      ? { dark: '#0d1f31', light: '#eaf8ff', accent: station.accent, secondary: station.secondary }
      : { dark: station.darkSquare, light: station.lightSquare, accent: station.accent, secondary: station.secondary }
  const style = {
    '--board-dark': palette.dark,
    '--board-light': palette.light,
    '--board-accent': palette.accent,
    '--piece-accent': palette.secondary,
    '--board-light-power': `${0.45 + light / 100}`,
  } as CSSProperties

  return (
    <div className={`game-board-stage board-${boardId} pieces-${pieceId}`} style={style}>
      <div className="game-board-heading"><span>{board?.geometry}</span><b>LEVEL {level}</b></div>
      <div className="game-board" role="img" aria-label={`${board?.name}, ${PIECE_PRESETS.find(item => item.id === pieceId)?.name}, level ${level} procedural preview`}>
        {PIECES.map((piece, index) => <span className={`game-square ${(Math.floor(index / 8) + index) % 2 ? 'is-dark' : 'is-light'}`} key={index}>{piece}</span>)}
      </div>
      {boardId === 'cube-512' ? <div className="cube-depth-lines" aria-hidden="true">{['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(item => <i className={item === level ? 'active' : ''} key={item} />)}</div> : null}
      <p>PROCEDURAL UI PREVIEW · NO GLB/FBX FILE GENERATED</p>
    </div>
  )
}

export function GameStudio() {
  const [searchParams] = useSearchParams()
  const requestedStation = searchParams.get('station') as ResearchStationPresetId | null
  const initialStation = RESEARCH_STATION_PRESETS.some(item => item.id === requestedStation) ? requestedStation! : 'earth-space'
  const [stationId, setStationId] = useState<ResearchStationPresetId>(initialStation)
  const [boardId, setBoardId] = useState<BoardId>('station-arena')
  const [pieceId, setPieceId] = useState<PieceId>('earth-guardian')
  const [level, setLevel] = useState('A')
  const [light, setLight] = useState(72)
  const [run, setRun] = useState<WorkflowRun | null>(null)
  const [running, setRunning] = useState(false)

  const station = getResearchStationPreset(stationId)
  const tournament = useMemo(() => (run?.result ?? {}) as TournamentView, [run])
  const stationModel = useMemo(() => generateProceduralAssetBundle(createAssetSpecification({
    track: 'terra-station',
    stationId,
    assetKind: 'station-shell',
    boardPreset: 'lab-ledcolor',
    piecePreset: 'earth-guardian',
    material: station.material,
    texture: station.texture,
    primaryColor: station.accent,
    secondaryColor: station.secondary,
    ledIntensity: light,
    scaleMm: 180,
    prompt: `Generate a deterministic research station concept proxy for ${station.name} ${station.subtitle}.`,
  })), [light, station, stationId])

  async function executeBenchmark() {
    setRunning(true)
    try {
      setRun(await runCubeTrainingWorkflow('Run a four-game deterministic Cube Chess benchmark from Game Studio'))
    } finally {
      setRunning(false)
    }
  }

  return (
    <>
      <section className="card studio-hero">
        <div>
          <p className="eyebrow">LEARN · COMPETE · CREATE · VERIFY</p>
          <h1>ForgeMCP Game Studio</h1>
          <p>Use the four Terra research stations as material and lighting systems, explore them as playable research-world concepts with Earth Guardian, preview boards and piece families, then run the real pinned Cube Chess benchmark before any human-approved upstream change.</p>
          <div className="toolbar">
            <a className="button-link button-link--primary" href={CUBE_URL} target="_blank" rel="noreferrer">Play the live Cube Chess 512 ↗</a>
            <Link className="button-link button-link--commerce" to="/cube-premium">Cube Premium · 30-day local test</Link>
            <Link className="button-link" to="/shop-lab">Open 3D + Shopify Test Lab</Link>
          </div>
        </div>
        <div className="studio-hero__status"><StatusBadge value="REAL ENGINE" /><StatusBadge value="PLAYABLE 3D" /><StatusBadge value="HUMAN GATE" /></div>
      </section>

      <PlayableStationWorlds station={station} />

      <section className="studio-workbench">
        <div className="studio-controls card">
          <div className="lab-section-title"><div><p className="eyebrow">STATION MATERIAL SYSTEM</p><h2>1. Select the research station</h2></div><StatusBadge value={station.status} /></div>
          <div className="studio-station-picker">
            {RESEARCH_STATION_PRESETS.map(item => <button type="button" className={item.id === stationId ? 'active' : ''} key={item.id} onClick={() => setStationId(item.id)} style={{ borderColor: item.id === stationId ? item.accent : undefined }}><b>{item.name}</b><small>{item.subtitle}</small></button>)}
          </div>
          <ProceduralAssetViewer bundle={stationModel} />
          <details className="concept-reference"><summary>Show station concept artwork</summary><StationConceptVisual station={station} compact /></details>
          <p>{station.gameApplication}</p>
          <p className="lab-note"><b>Model loaded:</b> {stationModel.metrics.vertices} vertices · {stationModel.metrics.triangles} triangles · {stationModel.geometryFingerprint}. Instruments are visualised from the station mission preset; this remains a browser-generated low-poly prototype, not a deployed physical station.</p>
          <small>{station.truthBoundary}</small>
          <div className="toolbar"><a className="button-link" href={station.publicUrl} target="_blank" rel="noreferrer">Open {station.name} source lab ↗</a><Link className="button-link button-link--quiet" to="/stations">Compare all four stations</Link></div>

          <h2>2. Board</h2>
          <div className="studio-option-list">
            {BOARD_PRESETS.map(item => <label className={item.id === boardId ? 'active' : ''} key={item.id}><input type="radio" name="board-preset" value={item.id} checked={item.id === boardId} onChange={() => setBoardId(item.id)} /><span><b>{item.name}</b><small>{item.geometry} · {item.status}</small></span></label>)}
          </div>

          <h2>3. Pieces</h2>
          <select aria-label="Piece family" value={pieceId} onChange={event => setPieceId(event.target.value as PieceId)}>
            {PIECE_PRESETS.map(item => <option value={item.id} key={item.id}>{item.name} · {item.status}</option>)}
          </select>

          <div className="studio-sliders">
            <label>Visible Cube level <select value={level} onChange={event => setLevel(event.target.value)}>{['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(item => <option key={item}>{item}</option>)}</select></label>
            <label>Light intensity <output>{light}%</output><input aria-label="Light intensity" type="range" min="0" max="100" value={light} onChange={event => setLight(Number(event.target.value))} /></label>
          </div>
        </div>

        <section className="card studio-preview">
          <div className="lab-section-title"><div><p className="eyebrow">REVERSIBLE VISUAL PREVIEW</p><h2>{BOARD_PRESETS.find(item => item.id === boardId)?.name}</h2></div><StatusBadge value={BOARD_PRESETS.find(item => item.id === boardId)?.status ?? 'PREVIEW'} /></div>
          <BoardPreview boardId={boardId} pieceId={pieceId} stationId={stationId} level={level} light={light} />
          <p className="lab-note">{BOARD_PRESETS.find(item => item.id === boardId)?.note} Preview choices stay inside ForgeMCP until a person approves an upstream implementation.</p>
        </section>
      </section>

      <MiniChessGame />

      <section className="card live-cube-card">
        <LiveProjectFrame
          title="Playable Cube Chess 512 upstream"
          url={CUBE_URL}
          description="This loads the real public 8×8×8 Cube Chess engine from its MIT-licensed source deployment. It includes the deployed Lab LEDColor, Crayon Cathedral and Classic Black & White visual families."
          loadLabel="Load playable Cube Chess 512"
          instructions="open Menu → New game, then choose Lab LEDColor, Crayon Cathedral or Classic Black & White. The embedded game remains cross-origin; ForgeMCP's own benchmark evidence stays separate below."
        />
      </section>

      <section className="grid two studio-generated-example">
        <article className="card">
          <p className="eyebrow">GENERATED CONCEPT · NOT A MODEL FILE</p>
          <h2>Earth Guardian example</h2>
          <img src={earthFigurineConcept} alt="AI-generated concept of a friendly Earth figurine on a black-and-white LED chessboard; not an original satellite image or production-ready 3D model" />
        </article>
        <article className="card">
          <p className="eyebrow">CODEX ASSET HANDOFF</p>
          <h2>Turn the idea into a verifiable build brief</h2>
          <p>The Product Lab carries this station, board and piece selection into the Codex assistant prompt, QA specification, Shopify draft and unsent B2B request.</p>
          <Link className="button-link button-link--primary" to="/shop-lab">Continue with this concept</Link>
        </article>
      </section>

      <section className="card benchmark-card">
        <div className="lab-section-title"><div><p className="eyebrow">SIMULATION &amp; QA</p><h2>4-game authoritative Cube benchmark</h2></div><StatusBadge value={run?.verification?.state ?? 'READY'} /></div>
        <p>This button really executes four legal, deterministic candidate-v-baseline games with paired seeds and side swap using the pinned Cube engine.</p>
        <button type="button" className="lab-primary" onClick={executeBenchmark} disabled={running}>{running ? 'Running four games…' : 'Execute 4-game benchmark'}</button>
        {run ? <>
          <div className="lab-metrics">
            <article><b>{tournament.tournament?.gamesCompleted ?? 0}</b><span>games executed now</span></article>
            <article><b>{tournament.tournament?.illegalMoves ?? 0}</b><span>illegal moves</span></article>
            <article><b>{tournament.tournament?.moveDiversity ?? 0}</b><span>distinct move records</span></article>
            <article><b>{tournament.tournament?.status ?? '—'}</b><span>benchmark gate</span></article>
          </div>
          <p className="lab-note"><b>Result:</b> {tournament.tournament?.wins ?? 0} wins · {tournament.tournament?.draws ?? 0} draws · {tournament.tournament?.losses ?? 0} losses. {tournament.proposedAction}</p>
        </> : null}
      </section>

      <section className="card training-ledger">
        <p className="eyebrow">TRAINING &amp; EXPERIMENT EVIDENCE — SEPARATED BY SOURCE</p>
        <h2>What was trained or tested, and what was not</h2>
        <div className="training-grid">
          <article><StatusBadge value="THIS RUN" /><b>4 legal games</b><p>ForgeMCP executes four 40-ply-cap deterministic games. No Elo or neural-network improvement is claimed.</p></article>
          <article><StatusBadge value="UPSTREAM HISTORY" /><b>100,000 virtual curriculum games</b><p><a href={CUBE_PR_101} target="_blank" rel="noreferrer">PR #101 ↗</a> tuned Alpha-Beta policy parameters across virtual decisions. It was not neural-network training and not 100,000 full legal game replays.</p></article>
          <article><StatusBadge value="UPSTREAM HISTORY" /><b>3,000 legal policy rollouts</b><p><a href={CUBE_PR_102} target="_blank" rel="noreferrer">PR #102 ↗</a> recorded 53,993 plies across three 1,000-rollout runs. It remains separate from this browser run.</p></article>
          <article><StatusBadge value="PRIVATE PROVENANCE" /><b>300 + 3 smoke run</b><p>The owner-authorized Chess Arena workspace records 300 curriculum games and three legal rollout smoke games. No private checkpoint or source file is loaded here, and this is not the unfinished 100k + 3k run.</p></article>
          <article><StatusBadge value="EXTERNAL DATASET" /><b>Visual compliance · ResNet50 448 px</b><p><a href={VISUAL_DATASET} target="_blank" rel="noreferrer">Dataset evidence ↗</a> is provenance only; Forge does not claim that those weights are loaded by the live Cube engine.</p></article>
        </div>
        <div className="toolbar"><a className="button-link" href={CUBE_PR_135} target="_blank" rel="noreferrer">Lab LEDColor + Classic board · PR #135 ↗</a><a className="button-link" href={CUBE_PR_126} target="_blank" rel="noreferrer">Refined Staunton figures · PR #126 ↗</a></div>
      </section>
    </>
  )
}
