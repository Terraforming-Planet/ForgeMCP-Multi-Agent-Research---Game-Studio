import type { Board3D } from "../board/Board3D.js";
import type { Piece } from "../pieces/Piece.js";
import type { Move } from "./Move.js";
import { createMove } from "./MoveFactory.js";
import type { Vector } from "./DirectionVectors.js";
export function generateSlidingMoves(board: Board3D, piece: Piece, directions: readonly Vector[]): Move[] {
  const moves: Move[] = [];
  for (const direction of directions) for (let distance = 1; ; distance += 1) {
    const to = piece.position.tryAdd(direction[0] * distance, direction[1] * distance, direction[2] * distance);
    if (!to) break;
    const target = board.getPieceAt(to);
    if (target?.color === piece.color) break;
    moves.push(createMove(piece, to, target));
    if (target) break;
  }
  return moves;
}
