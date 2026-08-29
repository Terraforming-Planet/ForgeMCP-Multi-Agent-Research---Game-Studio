import type { Board3D } from "../board/Board3D.js";
import type { Piece } from "../pieces/Piece.js";
import type { Move } from "./Move.js";
import { createMove } from "./MoveFactory.js";
import type { Vector } from "./DirectionVectors.js";
export function generateLeapingMoves(board: Board3D, piece: Piece, offsets: readonly Vector[]): Move[] {
  return offsets.flatMap((offset) => { const to = piece.position.tryAdd(offset[0], offset[1], offset[2]); if (!to || board.isOccupiedByColor(to, piece.color)) return []; return [createMove(piece, to, board.getPieceAt(to))]; });
}
