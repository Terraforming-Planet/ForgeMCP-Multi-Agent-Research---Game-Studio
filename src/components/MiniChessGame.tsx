import { useMemo, useState, type CSSProperties } from 'react'
import {
  DEFAULT_BASIC_GAME_PROMPT,
  generateBasicGameBlueprint,
  type BasicGameBlueprint,
  type BasicGameOpponentInput,
  type BasicGamePresetInput,
} from '../game/basicGameGenerator'
import {
  applyMiniChessMove,
  chooseDeterministicMiniChessMove,
  createInitialMiniChessBoard,
  getMiniChessLegalMoves,
  miniBoardIndex,
  MINI_FILES,
  MINI_PIECE_SYMBOLS,
  miniPositionFromIndex,
  miniSquareName,
  sameMiniSquare,
  type MiniMoveResult,
  type MiniPiece,
  type MiniPieceColor,
  type MiniSquare,
} from '../game/miniChessEngine'
import './MiniChessGame.css'

type HistoryEntry = {
  board: Array<MiniPiece | null>
  turn: MiniPieceColor
  moveText: string
  winner: MiniPieceColor | null
  plies: number
}

function opposite(color: MiniPieceColor): MiniPieceColor {
  return color === 'white' ? 'black' : 'white'
}

function titleCaseColor(color: MiniPieceColor) {
  return color === 'white' ? 'White' : 'Black'
}

function labelForSquare(piece: MiniPiece | null, position: MiniSquare) {
  return `${miniSquareName(position)} ${piece ? `${piece.color} ${piece.type}` : 'empty'}`
}

function describeMove(result: MiniMoveResult) {
  const { move } = result
  const capturedText = move.captured ? ` and captured the ${move.captured.color} ${move.captured.type}` : ''
  return `${titleCaseColor(move.piece.color)} ${move.piece.type} moved ${miniSquareName(move.from)}–${miniSquareName(move.to)}${capturedText}.`
}

function createDefaultBlueprint() {
  return generateBasicGameBlueprint({ prompt: DEFAULT_BASIC_GAME_PROMPT, preset: 'auto', opponent: 'auto' })
}

export function MiniChessGame() {
  const [board, setBoard] = useState(createInitialMiniChessBoard)
  const [turn, setTurn] = useState<MiniPieceColor>('white')
  const [selected, setSelected] = useState<MiniSquare | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [moveText, setMoveText] = useState('White to move. Select a piece.')
  const [plies, setPlies] = useState(0)
  const [winner, setWinner] = useState<MiniPieceColor | null>(null)
  const [prompt, setPrompt] = useState(DEFAULT_BASIC_GAME_PROMPT)
  const [presetInput, setPresetInput] = useState<BasicGamePresetInput>('auto')
  const [opponentInput, setOpponentInput] = useState<BasicGameOpponentInput>('auto')
  const [blueprint, setBlueprint] = useState<BasicGameBlueprint>(createDefaultBlueprint)
  const [generationMessage, setGenerationMessage] = useState('Default local blueprint loaded. Edit the prompt and generate to reset the playable game.')

  const legalMoves = useMemo(() => selected ? getMiniChessLegalMoves(board, selected) : [], [board, selected])
  const capturedPieces = useMemo(() => {
    const presentIds = new Set(board.flatMap(piece => piece ? [piece.id] : []))
    return createInitialMiniChessBoard().flatMap(piece => piece && !presentIds.has(piece.id) ? [piece] : [])
  }, [board])
  const sceneStyle = {
    '--mini-accent': blueprint.theme.accent,
    '--mini-secondary': blueprint.theme.secondary,
    '--mini-glow': blueprint.theme.glow,
  } as CSSProperties
  const humanCanAct = !winner && (blueprint.opponent === 'human' || turn === 'white')

  function handleSquareClick(position: MiniSquare) {
    if (!humanCanAct) return
    const targetPiece = board[miniBoardIndex(position.row, position.column)]

    if (!selected) {
      if (targetPiece?.color === turn) {
        setSelected(position)
        setMoveText(`${titleCaseColor(turn)} ${targetPiece.type} selected on ${miniSquareName(position)}.`)
      }
      return
    }

    if (targetPiece?.color === turn) {
      setSelected(position)
      setMoveText(`${titleCaseColor(turn)} ${targetPiece.type} selected on ${miniSquareName(position)}.`)
      return
    }

    if (!legalMoves.some(move => sameMiniSquare(move, position))) {
      setSelected(null)
      setMoveText(`That move is outside this piece's legal geometry. ${titleCaseColor(turn)} still moves.`)
      return
    }

    const previous: HistoryEntry = { board, turn, moveText, winner, plies }
    const humanResult = applyMiniChessMove(board, selected, position)
    if (!humanResult) return

    let nextBoard = humanResult.board
    let nextTurn = opposite(turn)
    let nextWinner = humanResult.winner
    let nextPlies = plies + 1
    let nextMessage = describeMove(humanResult)

    if (nextWinner) {
      nextMessage += ` ${titleCaseColor(nextWinner)} wins Capture Chess by taking the king.`
    } else if (blueprint.opponent === 'deterministic-baseline-v1' && nextTurn === 'black') {
      const computerMove = chooseDeterministicMiniChessMove(nextBoard, 'black', blueprint.seed, nextPlies)
      if (computerMove) {
        const computerResult = applyMiniChessMove(nextBoard, computerMove.from, computerMove.to)
        if (computerResult) {
          nextBoard = computerResult.board
          nextWinner = computerResult.winner
          nextPlies += 1
          nextMessage += ` Computer reply: ${describeMove(computerResult)}`
          if (nextWinner) nextMessage += ' Black wins Capture Chess by taking the king.'
          else nextTurn = 'white'
        }
      } else {
        nextMessage += ' The deterministic computer has no legal geometry move; undo or generate a new game.'
      }
    } else {
      nextMessage += ` ${titleCaseColor(nextTurn)} to move.`
    }

    setHistory(entries => [...entries, previous])
    setBoard(nextBoard)
    setTurn(nextTurn)
    setWinner(nextWinner)
    setPlies(nextPlies)
    setSelected(null)
    setMoveText(nextMessage)
  }

  function undoMove() {
    const previous = history.at(-1)
    if (!previous) return
    setBoard(previous.board)
    setTurn(previous.turn)
    setMoveText(`${previous.moveText} Last turn undone.`)
    setWinner(previous.winner)
    setPlies(previous.plies)
    setHistory(entries => entries.slice(0, -1))
    setSelected(null)
  }

  function resetGame(message = 'Board reset. White to move. Select a piece.') {
    setBoard(createInitialMiniChessBoard())
    setTurn('white')
    setSelected(null)
    setHistory([])
    setMoveText(message)
    setWinner(null)
    setPlies(0)
  }

  function generatePlayableGame() {
    const generated = generateBasicGameBlueprint({ prompt, preset: presetInput, opponent: opponentInput })
    setBlueprint(generated)
    resetGame(`Generated ${generated.title}. White to move. Select a piece.`)
    setGenerationMessage(`Generated ${generated.id} from the supported template. The board was reset and is ready to play.`)
  }

  function applyPromptExample(nextPrompt: string, preset: BasicGamePresetInput) {
    setPrompt(nextPrompt)
    setPresetInput(preset)
  }

  const gameStateLabel = winner ? `${winner.toUpperCase()} WINS` : `${turn.toUpperCase()} TURN`

  return (
    <section
      className="mini-chess"
      style={sceneStyle}
      data-scene={blueprint.theme.id}
      data-game-id={blueprint.id}
      data-piece-family={blueprint.pieceFamily}
      aria-labelledby="mini-chess-title"
    >
      <div className="mini-chess__header">
        <div>
          <p className="mini-chess__eyebrow">BASIC GAME GENERATOR V1 · PLAYABLE LOCAL TEMPLATE</p>
          <h2 id="mini-chess-title">Generate Capture Chess, then play it</h2>
        </div>
        <span className={`mini-chess__turn mini-chess__turn--${winner ?? turn}`}>{gameStateLabel}</span>
      </div>

      <div className="mini-chess__blueprint" aria-label="Generated game blueprint">
        <div><span>BLUEPRINT</span><code>{blueprint.id}</code></div>
        <div><span>RULESET</span><b>{blueprint.ruleset.id}</b></div>
        <div><span>OPPONENT</span><b>{blueprint.opponent}</b></div>
        <div><span>PIECES</span><b>{blueprint.pieceFamily}</b></div>
        <div><span>SEED</span><b>{blueprint.seed}</b></div>
      </div>

      <div className="mini-chess__layout">
        <div>
          <div className="mini-chess__board-frame">
            <div className="mini-chess__files" aria-hidden="true">{MINI_FILES.map(file => <span key={file}>{file}</span>)}</div>
            <div className="mini-chess__board" role="grid" aria-label="Playable standard 8 by 8 Capture Chess sandbox">
              {board.map((piece, index) => {
                const position = miniPositionFromIndex(index)
                const isSelected = selected ? sameMiniSquare(selected, position) : false
                const isLegal = legalMoves.some(move => sameMiniSquare(move, position))
                const canCapture = isLegal && Boolean(piece)
                return (
                  <button
                    type="button"
                    role="gridcell"
                    className={`mini-chess__square ${(position.row + position.column) % 2 ? 'is-dark' : 'is-light'}${isSelected ? ' is-selected' : ''}${isLegal ? ' is-legal' : ''}${canCapture ? ' can-capture' : ''}`}
                    key={`${position.row}-${position.column}`}
                    aria-label={labelForSquare(piece, position)}
                    aria-selected={isSelected}
                    data-legal={isLegal ? 'true' : 'false'}
                    disabled={!humanCanAct}
                    onClick={() => handleSquareClick(position)}
                  >
                    {position.column === 0 ? <span className="mini-chess__rank" aria-hidden="true">{8 - position.row}</span> : null}
                    {piece ? <span className={`mini-chess__piece is-${piece.color}`} aria-hidden="true">{MINI_PIECE_SYMBOLS[piece.color][piece.type]}</span> : null}
                    {isLegal ? <span className="mini-chess__move-dot" aria-hidden="true" /> : null}
                  </button>
                )
              })}
            </div>
          </div>
          <p className="mini-chess__status" role="status" aria-live="polite">{moveText}</p>
          <div className="mini-chess__actions">
            <button type="button" onClick={undoMove} disabled={!history.length}>Undo move</button>
            <button type="button" onClick={() => resetGame()}>Reset board</button>
            <span>{plies} {plies === 1 ? 'ply' : 'plies'} recorded</span>
          </div>
          <div className="mini-chess__captures" aria-label="Captured pieces">
            <b>Captured</b>
            <span>{capturedPieces.length ? capturedPieces.map(piece => MINI_PIECE_SYMBOLS[piece.color][piece.type]).join(' ') : 'None'}</span>
          </div>
        </div>

        <aside className="mini-chess__scene">
          <p className="mini-chess__eyebrow">PROMPT + PRESET → VERSIONED BLUEPRINT</p>
          <h3>Basic game generator</h3>
          <label htmlFor="mini-scene-prompt">Describe board lighting, piece family and opponent</label>
          <textarea id="mini-scene-prompt" value={prompt} onChange={event => setPrompt(event.target.value)} rows={5} />
          <div className="mini-chess__prompt-presets" aria-label="Game prompt examples">
            <button type="button" onClick={() => applyPromptExample('Sahara research board with amber warning LEDs', 'sahara')}>Sahara</button>
            <button type="button" onClick={() => applyPromptExample('Arctic ice station board with white-blue sensor light', 'arctic')}>Arctic</button>
            <button type="button" onClick={() => applyPromptExample('Earth Guardian orbital chessboard with green-blue LEDs versus computer', 'earth')}>Earth + computer</button>
          </div>
          <div className="mini-chess__generator-options">
            <label htmlFor="mini-game-preset">Visual preset
              <select id="mini-game-preset" value={presetInput} onChange={event => setPresetInput(event.target.value as BasicGamePresetInput)}>
                <option value="auto">Recognize from prompt</option>
                <option value="classic">Classic monochrome</option>
                <option value="earth">Earth orbit</option>
                <option value="sahara">Sahara signal</option>
                <option value="arctic">Arctic watch</option>
                <option value="ocean">Ocean sentinel</option>
                <option value="nebula">Violet nebula</option>
              </select>
            </label>
            <label htmlFor="mini-game-opponent">Opponent
              <select id="mini-game-opponent" value={opponentInput} onChange={event => setOpponentInput(event.target.value as BasicGameOpponentInput)}>
                <option value="auto">Recognize from prompt</option>
                <option value="human">Human vs human</option>
                <option value="deterministic-computer">Human vs deterministic computer</option>
              </select>
            </label>
          </div>
          <button className="mini-chess__generate" type="button" onClick={generatePlayableGame}>Generate playable game</button>
          <p className="mini-chess__generation-message" role="status" aria-live="polite">{generationMessage}</p>
          <div className="mini-chess__scene-result">
            <span className="mini-chess__swatch" aria-hidden="true" />
            <div><b>{blueprint.theme.label}</b><p>{blueprint.theme.summary}</p></div>
          </div>
          <div className="mini-chess__recognized" aria-label="Recognized generator features">
            {blueprint.interpretation.recognizedFeatures.map(feature => <code key={feature}>{feature}</code>)}
          </div>
          <small>This button creates a deterministic, versioned browser game blueprint and resets a playable board. It does not call an AI model or generate a 3D asset. Unsupported prompt details are preserved only as text.</small>
        </aside>
      </div>

      <p className="mini-chess__boundary"><b>Scope boundary:</b> standard piece geometry, alternating turns, captures and king-capture victory are active. This compact sandbox intentionally omits check/checkmate, castling, en-passant and promotion. It is not the separate Cube Chess 8×8×8 engine, and its computer is a deterministic heuristic rather than a trained model.</p>
    </section>
  )
}
