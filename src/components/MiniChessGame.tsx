import { useMemo, useState, type CSSProperties } from 'react'
import './MiniChessGame.css'

type PieceColor = 'white' | 'black'
type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn'

type Piece = {
  id: string
  color: PieceColor
  type: PieceType
}

type Square = {
  row: number
  column: number
}

type HistoryEntry = {
  board: Array<Piece | null>
  turn: PieceColor
  moveText: string
}

type SceneTheme = {
  id: string
  label: string
  accent: string
  secondary: string
  glow: string
  summary: string
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const
const BACK_RANK: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook']
const PIECE_SYMBOLS: Record<PieceColor, Record<PieceType, string>> = {
  white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
  black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' },
}

const DEFAULT_PROMPT = 'Black-and-white orbital board with blue-green LED light'

function boardIndex(row: number, column: number) {
  return row * 8 + column
}

function squareName({ row, column }: Square) {
  return `${FILES[column]}${8 - row}`
}

function isInside(row: number, column: number) {
  return row >= 0 && row < 8 && column >= 0 && column < 8
}

function createInitialBoard(): Array<Piece | null> {
  const board = Array<Piece | null>(64).fill(null)

  BACK_RANK.forEach((type, column) => {
    board[boardIndex(0, column)] = { id: `black-${type}-${column}`, color: 'black', type }
    board[boardIndex(1, column)] = { id: `black-pawn-${column}`, color: 'black', type: 'pawn' }
    board[boardIndex(6, column)] = { id: `white-pawn-${column}`, color: 'white', type: 'pawn' }
    board[boardIndex(7, column)] = { id: `white-${type}-${column}`, color: 'white', type }
  })

  return board
}

function addSlidingMoves(board: Array<Piece | null>, piece: Piece, origin: Square, directions: Square[], moves: Square[]) {
  directions.forEach(direction => {
    let row = origin.row + direction.row
    let column = origin.column + direction.column

    while (isInside(row, column)) {
      const target = board[boardIndex(row, column)]
      if (!target) {
        moves.push({ row, column })
      } else {
        if (target.color !== piece.color) moves.push({ row, column })
        break
      }
      row += direction.row
      column += direction.column
    }
  })
}

function getLegalGeometryMoves(board: Array<Piece | null>, origin: Square): Square[] {
  const piece = board[boardIndex(origin.row, origin.column)]
  if (!piece) return []

  const moves: Square[] = []
  const addStep = (row: number, column: number) => {
    if (!isInside(row, column)) return
    const target = board[boardIndex(row, column)]
    if (!target || target.color !== piece.color) moves.push({ row, column })
  }

  if (piece.type === 'pawn') {
    const direction = piece.color === 'white' ? -1 : 1
    const startRow = piece.color === 'white' ? 6 : 1
    const oneStepRow = origin.row + direction
    if (isInside(oneStepRow, origin.column) && !board[boardIndex(oneStepRow, origin.column)]) {
      moves.push({ row: oneStepRow, column: origin.column })
      const twoStepRow = origin.row + direction * 2
      if (origin.row === startRow && !board[boardIndex(twoStepRow, origin.column)]) {
        moves.push({ row: twoStepRow, column: origin.column })
      }
    }
    ;[-1, 1].forEach(offset => {
      const row = origin.row + direction
      const column = origin.column + offset
      if (!isInside(row, column)) return
      const target = board[boardIndex(row, column)]
      if (target && target.color !== piece.color) moves.push({ row, column })
    })
    return moves
  }

  if (piece.type === 'knight') {
    ;[
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1],
    ].forEach(([rowOffset, columnOffset]) => addStep(origin.row + rowOffset, origin.column + columnOffset))
    return moves
  }

  if (piece.type === 'king') {
    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
        if (rowOffset || columnOffset) addStep(origin.row + rowOffset, origin.column + columnOffset)
      }
    }
    return moves
  }

  const orthogonal = [{ row: -1, column: 0 }, { row: 1, column: 0 }, { row: 0, column: -1 }, { row: 0, column: 1 }]
  const diagonal = [{ row: -1, column: -1 }, { row: -1, column: 1 }, { row: 1, column: -1 }, { row: 1, column: 1 }]
  if (piece.type === 'rook' || piece.type === 'queen') addSlidingMoves(board, piece, origin, orthogonal, moves)
  if (piece.type === 'bishop' || piece.type === 'queen') addSlidingMoves(board, piece, origin, diagonal, moves)
  return moves
}

function deriveSceneTheme(prompt: string): SceneTheme {
  const normalized = prompt.trim().toLocaleLowerCase()

  if (/sahara|desert|piasek|pustyn/.test(normalized)) {
    return {
      id: 'sahara', label: 'Sahara signal', accent: '#ffb34f', secondary: '#ff5b79', glow: 'rgba(255, 179, 79, 0.48)',
      summary: 'Amber desert tiles, coral signal light and a warm atmospheric glow.',
    }
  }
  if (/arctic|polar|ice|lod|arkty/.test(normalized)) {
    return {
      id: 'arctic', label: 'Arctic watch', accent: '#80ecff', secondary: '#d8fbff', glow: 'rgba(128, 236, 255, 0.46)',
      summary: 'Ice-blue edges, white sensor light and a cold cryosphere glow.',
    }
  }
  if (/ocean|sea|blue|morze|ocean/.test(normalized) && !/green|zielon/.test(normalized)) {
    return {
      id: 'ocean', label: 'Ocean sentinel', accent: '#33c8ff', secondary: '#315dff', glow: 'rgba(51, 200, 255, 0.46)',
      summary: 'Cyan current lines, deep-blue pieces and a marine observation glow.',
    }
  }
  if (/earth|planet|orbital|ziemi|green|zielon/.test(normalized)) {
    return {
      id: 'earth', label: 'Earth orbit', accent: '#35f0a1', secondary: '#20bce8', glow: 'rgba(53, 240, 161, 0.46)',
      summary: 'Green-and-blue LEDs frame a black-and-white orbital research board.',
    }
  }
  if (/violet|purple|fiolet|nebula/.test(normalized)) {
    return {
      id: 'nebula', label: 'Violet nebula', accent: '#b789ff', secondary: '#ff6fd8', glow: 'rgba(183, 137, 255, 0.5)',
      summary: 'Violet edges, magenta piece light and a soft nebula halo.',
    }
  }

  let hash = 0
  for (const character of normalized || DEFAULT_PROMPT) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  const hue = hash % 360
  return {
    id: 'prompt-palette',
    label: 'Prompt palette',
    accent: `hsl(${hue} 86% 64%)`,
    secondary: `hsl(${(hue + 76) % 360} 84% 62%)`,
    glow: `hsl(${hue} 86% 64% / 0.45)`,
    summary: 'A deterministic colour palette derived locally from the scene prompt.',
  }
}

function positionFromIndex(index: number): Square {
  return { row: Math.floor(index / 8), column: index % 8 }
}

function sameSquare(left: Square, right: Square) {
  return left.row === right.row && left.column === right.column
}

function labelForSquare(piece: Piece | null, position: Square) {
  return `${squareName(position)} ${piece ? `${piece.color} ${piece.type}` : 'empty'}`
}

export function MiniChessGame() {
  const [board, setBoard] = useState(createInitialBoard)
  const [turn, setTurn] = useState<PieceColor>('white')
  const [selected, setSelected] = useState<Square | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [moveText, setMoveText] = useState('White to move. Select a piece.')
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [theme, setTheme] = useState(() => deriveSceneTheme(DEFAULT_PROMPT))

  const legalMoves = useMemo(() => selected ? getLegalGeometryMoves(board, selected) : [], [board, selected])
  const capturedPieces = useMemo(() => {
    const presentIds = new Set(board.flatMap(piece => piece ? [piece.id] : []))
    return createInitialBoard().flatMap(piece => piece && !presentIds.has(piece.id) ? [piece] : [])
  }, [board])
  const sceneStyle = {
    '--mini-accent': theme.accent,
    '--mini-secondary': theme.secondary,
    '--mini-glow': theme.glow,
  } as CSSProperties

  function handleSquareClick(position: Square) {
    const targetPiece = board[boardIndex(position.row, position.column)]

    if (!selected) {
      if (targetPiece?.color === turn) {
        setSelected(position)
        setMoveText(`${turn === 'white' ? 'White' : 'Black'} ${targetPiece.type} selected on ${squareName(position)}.`)
      }
      return
    }

    if (targetPiece?.color === turn) {
      setSelected(position)
      setMoveText(`${turn === 'white' ? 'White' : 'Black'} ${targetPiece.type} selected on ${squareName(position)}.`)
      return
    }

    if (!legalMoves.some(move => sameSquare(move, position))) {
      setSelected(null)
      setMoveText(`That move is outside this piece's legal geometry. ${turn === 'white' ? 'White' : 'Black'} still moves.`)
      return
    }

    const movingPiece = board[boardIndex(selected.row, selected.column)]
    if (!movingPiece) return
    const nextBoard = [...board]
    nextBoard[boardIndex(selected.row, selected.column)] = null
    nextBoard[boardIndex(position.row, position.column)] = movingPiece
    const capturedText = targetPiece ? ` and captured the ${targetPiece.color} ${targetPiece.type}` : ''
    const moveDescription = `${movingPiece.color === 'white' ? 'White' : 'Black'} ${movingPiece.type} moved ${squareName(selected)}–${squareName(position)}${capturedText}.`
    const nextTurn = turn === 'white' ? 'black' : 'white'

    setHistory(entries => [...entries, { board, turn, moveText }])
    setBoard(nextBoard)
    setTurn(nextTurn)
    setSelected(null)
    setMoveText(`${moveDescription} ${nextTurn === 'white' ? 'White' : 'Black'} to move.`)
  }

  function undoMove() {
    const previous = history.at(-1)
    if (!previous) return
    setBoard(previous.board)
    setTurn(previous.turn)
    setMoveText(`${previous.moveText} Last move undone.`)
    setHistory(entries => entries.slice(0, -1))
    setSelected(null)
  }

  function resetGame() {
    setBoard(createInitialBoard())
    setTurn('white')
    setSelected(null)
    setHistory([])
    setMoveText('Board reset. White to move. Select a piece.')
  }

  function applyScenePrompt() {
    setTheme(deriveSceneTheme(prompt))
  }

  return (
    <section className="mini-chess" style={sceneStyle} data-scene={theme.id} aria-labelledby="mini-chess-title">
      <div className="mini-chess__header">
        <div>
          <p className="mini-chess__eyebrow">PLAYABLE 8×8 SANDBOX · LOCAL STATE</p>
          <h2 id="mini-chess-title">Make a move, then restyle the scene</h2>
        </div>
        <span className={`mini-chess__turn mini-chess__turn--${turn}`}>{turn.toUpperCase()} TURN</span>
      </div>

      <div className="mini-chess__layout">
        <div>
          <div className="mini-chess__board-frame">
            <div className="mini-chess__files" aria-hidden="true">{FILES.map(file => <span key={file}>{file}</span>)}</div>
            <div className="mini-chess__board" role="grid" aria-label="Playable standard 8 by 8 chess sandbox">
              {board.map((piece, index) => {
                const position = positionFromIndex(index)
                const isSelected = selected ? sameSquare(selected, position) : false
                const isLegal = legalMoves.some(move => sameSquare(move, position))
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
                    onClick={() => handleSquareClick(position)}
                  >
                    {position.column === 0 ? <span className="mini-chess__rank" aria-hidden="true">{8 - position.row}</span> : null}
                    {piece ? <span className={`mini-chess__piece is-${piece.color}`} aria-hidden="true">{PIECE_SYMBOLS[piece.color][piece.type]}</span> : null}
                    {isLegal ? <span className="mini-chess__move-dot" aria-hidden="true" /> : null}
                  </button>
                )
              })}
            </div>
          </div>
          <p className="mini-chess__status" role="status" aria-live="polite">{moveText}</p>
          <div className="mini-chess__actions">
            <button type="button" onClick={undoMove} disabled={!history.length}>Undo move</button>
            <button type="button" onClick={resetGame}>Reset board</button>
            <span>{history.length} {history.length === 1 ? 'move' : 'moves'} recorded</span>
          </div>
          <div className="mini-chess__captures" aria-label="Captured pieces">
            <b>Captured</b>
            <span>{capturedPieces.length ? capturedPieces.map(piece => PIECE_SYMBOLS[piece.color][piece.type]).join(' ') : 'None'}</span>
          </div>
        </div>

        <aside className="mini-chess__scene">
          <p className="mini-chess__eyebrow">LOCAL PROMPT → VISUAL THEME</p>
          <h3>Scene prompt</h3>
          <label htmlFor="mini-scene-prompt">Describe board lighting and atmosphere</label>
          <textarea id="mini-scene-prompt" value={prompt} onChange={event => setPrompt(event.target.value)} rows={4} />
          <div className="mini-chess__prompt-presets" aria-label="Scene prompt examples">
            <button type="button" onClick={() => setPrompt('Sahara research board with amber warning LEDs')}>Sahara</button>
            <button type="button" onClick={() => setPrompt('Arctic ice station board with white-blue sensor light')}>Arctic</button>
            <button type="button" onClick={() => setPrompt('Earth orbital chessboard with green and blue LEDs')}>Earth orbit</button>
          </div>
          <button className="mini-chess__generate" type="button" onClick={applyScenePrompt}>Apply scene prompt</button>
          <div className="mini-chess__scene-result" role="status">
            <span className="mini-chess__swatch" aria-hidden="true" />
            <div><b>{theme.label}</b><p>{theme.summary}</p></div>
          </div>
          <small>This prompt changes a deterministic browser theme only. It does not call an AI model or generate a 3D asset.</small>
        </aside>
      </div>

      <p className="mini-chess__boundary"><b>Scope boundary:</b> standard piece geometry, alternating turns and captures are active. This compact sandbox intentionally omits check/checkmate, castling, en-passant and promotion. It is not the separate Cube Chess 8×8×8 engine.</p>
    </section>
  )
}
