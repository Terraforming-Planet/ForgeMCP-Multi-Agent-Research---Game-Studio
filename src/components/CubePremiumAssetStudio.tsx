import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  createAssetSpecification,
  type AssetConfiguration,
  type BoardPreset,
  type PiecePreset,
} from '../integrations/commerce/productLab'
import {
  generateProceduralAssetBundle,
  proceduralAssetManifest,
  type ProceduralAssetBundle,
} from '../integrations/commerce/proceduralAssets'
import { MiniChessGame } from './MiniChessGame'
import { ProceduralAssetViewer } from './ProceduralAssetViewer'
import { StatusBadge } from './StatusBadge'

type PieceOption = {
  id: string
  label: string
  role: string
  piecePreset: PiecePreset
  prompt: string
  primary: string
  secondary: string
}

const BOARD_OPTIONS: Array<{ id: BoardPreset; label: string; short: string; description: string }> = [
  { id: 'cube-512', label: 'Cube Chess 512', short: '8 × 8 × 8', description: 'Osiem poziomów i 512 adresowanych pól z osobną geometrią warstw.' },
  { id: 'classic-mono', label: 'Classic Black & White', short: '8 × 8', description: 'Klasyczna czarno-biała plansza o spokojnym kamiennym wykończeniu.' },
  { id: 'lab-ledcolor', label: 'Lab LEDColor', short: 'LED', description: 'Plansza testowa z regulowaną zielono-niebieską ramą emisyjną.' },
]

const PIECE_OPTIONS: PieceOption[] = [
  {
    id: 'earth-guardian', label: 'Strażnik Ziemi', role: 'postać Ziemi', piecePreset: 'earth-guardian', primary: '#16a7e0', secondary: '#35f0a1',
    prompt: 'Zaprojektuj model 3D figurki planety Ziemia jako przyjaznej bajkowej postaci stojącej na czarno-białej szachownicy z zielono-niebieskim podświetleniem LED. Dodaj czytelne oczy, subtelny uśmiech, wypukłe kontynenty, małe chmury, rękawiczki, stabilne buty i okrągłą podstawę mieszczącą się w jednym polu.',
  },
  {
    id: 'king', label: 'Król orbitalny', role: 'król', piecePreset: 'czech-facet', primary: '#56ddff', secondary: '#35f0a1',
    prompt: 'Zaprojektuj rozpoznawalnego króla szachowego o smukłej, mocnej sylwetce Staunton, fasetowanym korpusie inspirowanym czeskim kubizmem, geometrycznej koronie i dyskretnej zielono-niebieskiej strefie LED. Zachowaj stabilną podstawę, czytelny profil i właściwą hierarchię wysokości.',
  },
  {
    id: 'queen', label: 'Hetman orbitalny', role: 'hetman', piecePreset: 'czech-facet', primary: '#a77bff', secondary: '#56ddff',
    prompt: 'Zaprojektuj eleganckiego hetmana szachowego z wyraźną koroną, smukłą talią, kontrolowanymi fasetami czeskiego kubizmu i delikatnym pierścieniem LED. Sylwetka ma być natychmiast rozpoznawalna z góry oraz pod kątem 3/4.',
  },
  {
    id: 'bishop', label: 'Goniec fasetowany', role: 'goniec', piecePreset: 'czech-facet', primary: '#7ba8ff', secondary: '#35f0a1',
    prompt: 'Zaprojektuj gońca szachowego z jednoznacznym nacięciem mitry, wysoką czytelną sylwetką, stabilną podstawą i kierunkowymi fasetami. Dodaj wąską zielono-niebieską linię LED, nie zasłaniając klasycznego kształtu figury.',
  },
  {
    id: 'rook', label: 'Wieża kubistyczna', role: 'wieża', piecePreset: 'czech-facet', primary: '#6f8cff', secondary: '#5de4ff',
    prompt: 'Zaprojektuj masywną wieżę szachową z czterema czytelnymi blankami, wielowarstwową podstawą i kontrolowanymi fasetami. Dodaj chłodny kanał LED w zagłębieniu, zachowując charakter klasycznej wieży turniejowej.',
  },
  {
    id: 'knight', label: 'Koń Crayon', role: 'koń', piecePreset: 'lab-ledcolor', primary: '#ffb547', secondary: '#ff54d8',
    prompt: 'Zaprojektuj wysokiej jakości konia szachowego z wyraźnym pyskiem, nozdrzami, uszami, łukiem szyi i centralną wielobarwną grzywą z rytmicznych elementów przypominających kredki. Bez anten i przypadkowych kolców. Wyśrodkuj bryłę nad stabilną podstawą i zachowaj klasyczny profil konia.',
  },
  {
    id: 'pawn', label: 'Pion klasyczny', role: 'pion', piecePreset: 'classic', primary: '#d8e2f3', secondary: '#5de4ff',
    prompt: 'Zaprojektuj czytelny pion szachowy w proporcjach Staunton: kulista głowa, krótka szyja, miękko zwężający się korpus i szeroka stabilna podstawa. Dodaj delikatną kamienną mikroteksturę i bardzo subtelny niebieski pierścień LED.',
  },
]

function configurationForBoard(boardPreset: BoardPreset, primaryColor: string, secondaryColor: string, ledIntensity: number): AssetConfiguration {
  const board = BOARD_OPTIONS.find(option => option.id === boardPreset) ?? BOARD_OPTIONS[2]
  return {
    track: 'cube-asset', stationId: 'earth-space', assetKind: 'board', boardPreset, piecePreset: 'czech-facet',
    material: boardPreset === 'classic-mono' ? 'Stone-like monochrome tournament surface' : 'Dark recyclable composite with emissive inlay',
    texture: boardPreset === 'cube-512' ? 'Eight colour-coded level grids with alternating fields' : boardPreset === 'classic-mono' ? 'Black-and-white stone checker pattern' : 'Checker grid with controllable LED edge channels',
    primaryColor, secondaryColor, ledIntensity, scaleMm: 500,
    prompt: `Wygeneruj ${board.label}: ${board.description}`,
  }
}

function configurationForPiece(option: PieceOption, boardPreset: BoardPreset, prompt: string, primaryColor: string, secondaryColor: string, ledIntensity: number): AssetConfiguration {
  return {
    track: 'cube-asset', stationId: 'earth-space', assetKind: 'figurine', boardPreset, piecePreset: option.piecePreset,
    material: option.id === 'earth-guardian' ? 'Painted resin with recyclable display base' : 'Faceted resin with controlled roughness and emissive inlay',
    texture: option.id === 'earth-guardian' ? 'Raised continents, cloud relief and controlled gloss' : 'Non-overlapping UV concept with PBR colour, roughness and LED zones',
    primaryColor, secondaryColor, ledIntensity, scaleMm: 120, prompt,
  }
}

function createInitialBundles() {
  const piece = PIECE_OPTIONS[0]
  const boardConfiguration = configurationForBoard('lab-ledcolor', piece.primary, piece.secondary, 70)
  const pieceConfiguration = configurationForPiece(piece, 'lab-ledcolor', piece.prompt, piece.primary, piece.secondary, 70)
  return {
    board: generateProceduralAssetBundle(createAssetSpecification(boardConfiguration)),
    piece: generateProceduralAssetBundle(createAssetSpecification(pieceConfiguration)),
  }
}

function TexturePreview({ bundle }: { bundle: ProceduralAssetBundle }) {
  const url = useMemo(() => URL.createObjectURL(new Blob([Uint8Array.from(bundle.texture.bytes).buffer], { type: bundle.texture.mimeType })), [bundle])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  return <img src={url} alt={`Generated texture preview for ${bundle.preview.label}`} />
}

function downloadFile(filename: string, content: string | Uint8Array, mimeType: string) {
  const part: BlobPart = typeof content === 'string' ? content : Uint8Array.from(content).buffer
  const url = URL.createObjectURL(new Blob([part], { type: mimeType }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function downloadManifest(bundle: ProceduralAssetBundle) {
  downloadFile(`${bundle.specificationId}-manifest.json`, JSON.stringify(proceduralAssetManifest(bundle), null, 2), 'application/json')
}

export function CubePremiumAssetStudio({ trialActive }: { trialActive: boolean }) {
  const [initial] = useState(() => createInitialBundles())
  const [boardPreset, setBoardPreset] = useState<BoardPreset>('lab-ledcolor')
  const [pieceId, setPieceId] = useState(PIECE_OPTIONS[0].id)
  const [prompt, setPrompt] = useState(PIECE_OPTIONS[0].prompt)
  const [primaryColor, setPrimaryColor] = useState(PIECE_OPTIONS[0].primary)
  const [secondaryColor, setSecondaryColor] = useState(PIECE_OPTIONS[0].secondary)
  const [ledIntensity, setLedIntensity] = useState(70)
  const [boardBundle, setBoardBundle] = useState(initial.board)
  const [pieceBundle, setPieceBundle] = useState(initial.piece)
  const [message, setMessage] = useState('Przykładowa plansza Lab LEDColor i Strażnik Ziemi są gotowe. Zmień parametry i naciśnij generowanie.')
  const [copyMessage, setCopyMessage] = useState('')

  const pieceOption = PIECE_OPTIONS.find(option => option.id === pieceId) ?? PIECE_OPTIONS[0]
  const boardConfiguration = useMemo(() => configurationForBoard(boardPreset, primaryColor, secondaryColor, ledIntensity), [boardPreset, primaryColor, secondaryColor, ledIntensity])
  const pieceConfiguration = useMemo(() => configurationForPiece(pieceOption, boardPreset, prompt, primaryColor, secondaryColor, ledIntensity), [pieceOption, boardPreset, prompt, primaryColor, secondaryColor, ledIntensity])
  const boardSpecification = useMemo(() => createAssetSpecification(boardConfiguration), [boardConfiguration])
  const pieceSpecification = useMemo(() => createAssetSpecification(pieceConfiguration), [pieceConfiguration])
  const boardCurrent = boardBundle.specificationId === boardSpecification.id
  const pieceCurrent = pieceBundle.specificationId === pieceSpecification.id

  const agentPrompt = useMemo(() => `Zadanie dla agenta Codex — Cube Chess Premium\n\n${prompt}\n\nPlansza: ${BOARD_OPTIONS.find(option => option.id === boardPreset)?.label}. Kolory LED: ${primaryColor} i ${secondaryColor}, intensywność ${ledIntensity}%. Zachowaj klasyczną hierarchię i rozpoznawalność figury z góry i w widoku 3/4. Środek modelu ustaw w (0,0,0), oś Y skieruj w górę, dopasuj podstawę do jednego pola. Przygotuj niepokrywające się UV, PBR baseColor/roughness/metalness/emissive, wariant jasny i ciemny, LOD0/LOD1/LOD2 oraz GLB. Dołącz liczbę wierzchołków i trójkątów, bounds, normals/UV QA, SHA-256 i manifest pochodzenia. Korzystaj wyłącznie z zasobów właściciela po potwierdzeniu wpisu w manifeście. Nie twierdź, że model jest produkcyjny ani że wytrenowany przeciwnik został załadowany, dopóki nie potwierdzą tego artefakty i testy.`, [prompt, boardPreset, primaryColor, secondaryColor, ledIntensity])

  function selectPiece(option: PieceOption) {
    setPieceId(option.id)
    setPrompt(option.prompt)
    setPrimaryColor(option.primary)
    setSecondaryColor(option.secondary)
    setMessage(`${option.label} wybrany. Naciśnij generowanie, aby utworzyć nową geometrię i tekstury.`)
  }

  function generateSet() {
    const nextBoard = generateProceduralAssetBundle(boardSpecification)
    const nextPiece = generateProceduralAssetBundle(pieceSpecification)
    setBoardBundle(nextBoard)
    setPieceBundle(nextPiece)
    setMessage(`Wygenerowano ${nextBoard.preview.label} oraz ${nextPiece.preview.label}: ${nextBoard.metrics.triangles + nextPiece.metrics.triangles} trójkątów łącznie. Podgląd, tekstury i pliki glTF pochodzą z tej samej specyfikacji.`)
  }

  async function copyAgentPrompt() {
    try {
      await navigator.clipboard.writeText(agentPrompt)
      setCopyMessage('Prompt agenta Codex skopiowany.')
    } catch {
      setCopyMessage('Kopiowanie jest zablokowane w tej przeglądarce — zaznacz prompt ręcznie.')
    }
  }

  const style = {
    '--premium-primary': primaryColor,
    '--premium-secondary': secondaryColor,
    '--premium-led': `${ledIntensity / 100}`,
  } as CSSProperties

  return (
    <div className="cube-premium-studio" style={style}>
      <section className="cube-premium-workbench">
        <div className="cube-premium-section-heading">
          <div><p className="cube-premium-kicker">MODELE · PLANSZE · WŁASNY PROMPT</p><h2>Wybierz planszę i figurę, potem wygeneruj własny zestaw</h2></div>
          <StatusBadge value={trialActive ? '30-DAY TEST ACTIVE' : 'FREE JUDGE PREVIEW'} />
        </div>
        <p className="cube-premium-explainer">Podglądy są dostępne od razu. Generator tworzy lokalnie rzeczywistą, samodzielną geometrię glTF i teksturę PNG — nie jest to tylko obrazek ani obietnica przyszłej funkcji.</p>

        <div className="cube-premium-builder-grid">
          <div className="cube-premium-controls">
            <fieldset>
              <legend>1. Trzy plansze</legend>
              <div className="cube-board-options">
                {BOARD_OPTIONS.map(option => (
                  <button type="button" key={option.id} aria-pressed={boardPreset === option.id} onClick={() => { setBoardPreset(option.id); setMessage(`${option.label} wybrana. Naciśnij generowanie, aby przebudować model planszy.`) }}>
                    <span className={`cube-board-icon cube-board-icon--${option.id}`} aria-hidden="true"><i /><i /><i /></span>
                    <b>{option.label}</b><small>{option.short} · {option.description}</small>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend>2. Figury i postacie</legend>
              <div className="cube-piece-options">
                {PIECE_OPTIONS.map(option => <button type="button" key={option.id} aria-pressed={pieceId === option.id} onClick={() => selectPiece(option)}><span aria-hidden="true">{option.id === 'earth-guardian' ? '🌍' : option.id === 'king' ? '♚' : option.id === 'queen' ? '♛' : option.id === 'bishop' ? '♝' : option.id === 'rook' ? '♜' : option.id === 'knight' ? '♞' : '♟'}</span><b>{option.label}</b></button>)}
              </div>
            </fieldset>

            <label htmlFor="cube-premium-prompt">3. Własny prompt modelu i tekstury</label>
            <textarea id="cube-premium-prompt" rows={7} value={prompt} onChange={event => setPrompt(event.target.value)} />
            <div className="cube-premium-colours">
              <label>Główny kolor LED<input aria-label="Główny kolor Premium" type="color" value={primaryColor} onChange={event => setPrimaryColor(event.target.value)} /></label>
              <label>Drugi kolor LED<input aria-label="Drugi kolor Premium" type="color" value={secondaryColor} onChange={event => setSecondaryColor(event.target.value)} /></label>
            </div>
            <label>Intensywność LED <output>{ledIntensity}%</output><input aria-label="Intensywność LED Premium" type="range" min="0" max="100" value={ledIntensity} onChange={event => setLedIntensity(Number(event.target.value))} /></label>
            <button type="button" className="cube-premium-generate" onClick={generateSet}>Wygeneruj zestaw 3D + tekstury</button>
            <p className="cube-premium-generation-message" role="status" aria-live="polite">{message}</p>
          </div>

          <div className="cube-premium-live-previews">
            <article>
              <div><p className="cube-premium-kicker">PODGLĄD PLANSZY</p><StatusBadge value={boardCurrent ? 'GLTF READY' : 'REGENERATE'} /></div>
              <ProceduralAssetViewer bundle={boardBundle} stale={!boardCurrent} />
              <div className="cube-premium-texture-row"><TexturePreview bundle={boardBundle} /><p><b>{boardBundle.preview.label}</b><br />{boardBundle.metrics.vertices} wierzchołków · {boardBundle.metrics.triangles} trójkątów<br /><small>{boardBundle.texture.pattern}</small></p></div>
              <div className="cube-premium-downloads"><button type="button" onClick={() => downloadFile(boardBundle.model.filename, boardBundle.model.content, boardBundle.model.mimeType)}>Pobierz planszę .gltf</button><button type="button" onClick={() => downloadFile(boardBundle.texture.filename, boardBundle.texture.bytes, boardBundle.texture.mimeType)}>Pobierz teksturę planszy .png</button><button type="button" onClick={() => downloadManifest(boardBundle)}>Manifest QA planszy</button></div>
            </article>
            <article>
              <div><p className="cube-premium-kicker">PODGLĄD FIGURY</p><StatusBadge value={pieceCurrent ? 'GLTF READY' : 'REGENERATE'} /></div>
              <ProceduralAssetViewer bundle={pieceBundle} stale={!pieceCurrent} />
              <div className="cube-premium-texture-row"><TexturePreview bundle={pieceBundle} /><p><b>{pieceBundle.preview.label}</b><br />{pieceBundle.metrics.vertices} wierzchołków · {pieceBundle.metrics.triangles} trójkątów<br /><small>{pieceBundle.texture.pattern}</small></p></div>
              <div className="cube-premium-downloads"><button type="button" onClick={() => downloadFile(pieceBundle.model.filename, pieceBundle.model.content, pieceBundle.model.mimeType)}>Pobierz figurę .gltf</button><button type="button" onClick={() => downloadFile(pieceBundle.texture.filename, pieceBundle.texture.bytes, pieceBundle.texture.mimeType)}>Pobierz teksturę figury .png</button><button type="button" onClick={() => downloadManifest(pieceBundle)}>Manifest QA figury</button></div>
            </article>
          </div>
        </div>
      </section>

      <section className="cube-premium-agent">
        <div className="cube-premium-section-heading"><div><p className="cube-premium-kicker">ASYSTENT FORGEMCP + AGENT CODEX</p><h2>Prompt do dalszego modelowania, teksturowania i QA</h2></div><button type="button" onClick={copyAgentPrompt}>Kopiuj prompt</button></div>
        <textarea aria-label="Prompt dla agenta Codex w Cube Premium" rows={12} readOnly value={agentPrompt} />
        {copyMessage ? <p role="status">{copyMessage}</p> : null}
      </section>

      <section className="cube-premium-game-generator">
        <div className="cube-premium-section-heading"><div><p className="cube-premium-kicker">GRYWALNY PRZYKŁAD</p><h2>Wygeneruj podstawową grę i od razu wykonaj ruch</h2></div><StatusBadge value="LOCAL DETERMINISTIC" /></div>
        <MiniChessGame />
      </section>
    </div>
  )
}
