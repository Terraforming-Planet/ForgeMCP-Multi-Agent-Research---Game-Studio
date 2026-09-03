import { hashGameText } from './basicGameGenerator'

export type MiniPieceColor = 'white' | 'black'
export type MiniPieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn'

export type MiniPiece = {
  id: string
  color: MiniPieceColor
  type: MiniPieceType
}

export type MiniSquare = {
  row: number
  column: number
}

export type MiniMove = {
  from: MiniSquare
  to: MiniSquare
  piece: MiniPiece
  captured: MiniPiece | null
}

export type MiniMoveResult = {
  board: Array<MiniPiece | null>
  move: MiniMove
  winner: MiniPieceColor | null
}

export const MINI_FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const
export const MINI_BACK_RANK: MiniPieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook']
export const MINI_PIECE_SYMBOLS: Record<MiniPieceColor, Record<MiniPieceType, string>> = {
  white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
  black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' },
}

const PIECE_VALUE: Record<MiniPieceType, number> = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 100 }

export function miniBoardIndex(row: number, column: number) {
  return row * 8 + column
}

export function miniSquareName({ row, column }: MiniSquare) {
  return `${MINI_FILES[column]}${8 - row}`
}

export function miniPositionFromIndex(index: number): MiniSquare {
  return { row: Math.floor(index / 8), column: index % 8 }
}

export function sameMiniSquare(left: MiniSquare, right: MiniSquare) {
  return left.row === right.row && left.column === right.column
}

function isInside(row: number, column: number) {
  return row >= 0 && row < 8 && column >= 0 && column < 8
}

export function createInitialMiniChessBoard(): Array<MiniPiece | null> {
  const board = Array<MiniPiece | null>(64).fill(null)

  MINI_BACK_RANK.forEach((type, column) => {
    board[miniBoardIndex(0, column)] = { id: `black-${type}-${column}`, color: 'black', type }
    board[miniBoardIndex(1, column)] = { id: `black-pawn-${column}`, color: 'black', type: 'pawn' }
    board[miniBoardIndex(6, column)] = { id: `white-pawn-${column}`, color: 'white', type: 'pawn' }
    board[miniBoardIndex(7, column)] = { id: `white-${type}-${column}`, color: 'white', type }
  })

  return board
}

export function createMiniChessBoard(entries: Array<{ square: MiniSquare; piece: MiniPiece }>) {
  const board = Array<MiniPiece | null>(64).fill(null)
  for (const entry of entries) board[miniBoardIndex(entry.square.row, entry.square.column)] = entry.piece
  return board
}

function addSlidingMoves(board: Array<MiniPiece | null>, piece: MiniPiece, origin: MiniSquare, directions: MiniSquare[], moves: MiniSquare[]) {
  directions.forEach(direction => {
    let row = origin.row + direction.row
    let column = origin.column + direction.column

    while (isInside(row, column)) {
      const target = board[miniBoardIndex(row, column)]
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

export function getMiniChessLegalMoves(board: Array<MiniPiece | null>, origin: MiniSquare): MiniSquare[] {
  const piece = board[miniBoardIndex(origin.row, origin.column)]
  if (!piece) return []

  const moves: MiniSquare[] = []
  const addStep = (row: number, column: number) => {
    if (!isInside(row, column)) return
    const target = board[miniBoardIndex(row, column)]
    if (!target || target.color !== piece.color) moves.push({ row, column })
  }

  if (piece.type === 'pawn') {
    const direction = piece.color === 'white' ? -1 : 1
    const startRow = piece.color === 'white' ? 6 : 1
    const oneStepRow = origin.row + direction
    if (isInside(oneStepRow, origin.column) && !board[miniBoardIndex(oneStepRow, origin.column)]) {
      moves.push({ row: oneStepRow, column: origin.column })
      const twoStepRow = origin.row + direction * 2
      if (origin.row === startRow && isInside(twoStepRow, origin.column) && !board[miniBoardIndex(twoStepRow, origin.column)]) {
        moves.push({ row: twoStepRow, column: origin.column })
      }
    }
    ;[-1, 1].forEach(offset => {
      const row = origin.row + direction
      const column = origin.column + offset
      if (!isInside(row, column)) return
      const target = board[miniBoardIndex(row, column)]
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

export function listMiniChessLegalMoves(board: Array<MiniPiece | null>, color: MiniPieceColor): MiniMove[] {
  const moves: MiniMove[] = []
  board.forEach((piece, index) => {
    if (piece?.color !== color) return
    const from = miniPositionFromIndex(index)
    for (const to of getMiniChessLegalMoves(board, from)) {
      moves.push({ from, to, piece, captured: board[miniBoardIndex(to.row, to.column)] })
    }
  })
  return moves.sort((left, right) => miniMoveKey(left).localeCompare(miniMoveKey(right)))
}

export function miniMoveKey(move: Pick<MiniMove, 'piece' | 'from' | 'to'>) {
  return `${move.piece.id}:${miniSquareName(move.from)}-${miniSquareName(move.to)}`
}

export function applyMiniChessMove(board: Array<MiniPiece | null>, from: MiniSquare, to: MiniSquare): MiniMoveResult | null {
  const piece = board[miniBoardIndex(from.row, from.column)]
  if (!piece || !getMiniChessLegalMoves(board, from).some(move => sameMiniSquare(move, to))) return null

  const captured = board[miniBoardIndex(to.row, to.column)]
  const nextBoard = [...board]
  nextBoard[miniBoardIndex(from.row, from.column)] = null
  nextBoard[miniBoardIndex(to.row, to.column)] = piece
  return {
    board: nextBoard,
    move: { from, to, piece, captured },
    winner: captured?.type === 'king' ? piece.color : null,
  }
}

export function chooseDeterministicMiniChessMove(board: Array<MiniPiece | null>, color: MiniPieceColor, seed: number, ply: number): MiniMove | null {
  const moves = listMiniChessLegalMoves(board, color)
  if (!moves.length) return null
  const score = (move: MiniMove) => {
    const capture = move.captured ? PIECE_VALUE[move.captured.type] * 10_000 : 0
    const centerDistance = Math.abs(move.to.row * 2 - 7) + Math.abs(move.to.column * 2 - 7)
    const center = 28 - centerDistance
    return capture + center
  }
  const highest = Math.max(...moves.map(score))
  const best = moves.filter(move => score(move) === highest)
  const candidates = best.map(miniMoveKey).join('|')
  return best[hashGameText(`${seed}:${ply}:${candidates}`) % best.length] ?? null
}
