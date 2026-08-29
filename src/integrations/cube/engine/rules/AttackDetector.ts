import type { Board3D } from "../board/Board3D.js";
import type { Coordinate3D } from "../coordinates/Coordinate3D.js";
import {
  BISHOP_DIRECTIONS,
  KING_DIRECTIONS,
  KNIGHT_OFFSETS,
  QUEEN_DIRECTIONS,
  ROOK_DIRECTIONS,
  type Vector,
} from "../moves/DirectionVectors.js";
import type { Piece, PieceColor } from "../pieces/Piece.js";

function attacksByLeap(
  piece: Piece,
  target: Coordinate3D,
  offsets: readonly Vector[],
): boolean {
  return offsets.some((offset) =>
    piece.position.tryAdd(...offset)?.equals(target) ?? false,
  );
}

function attacksByRay(
  board: Board3D,
  piece: Piece,
  target: Coordinate3D,
  directions: readonly Vector[],
): boolean {
  for (const direction of directions) {
    for (let distance = 1; ; distance += 1) {
      const square = piece.position.tryAdd(
        direction[0] * distance,
        direction[1] * distance,
        direction[2] * distance,
      );

      if (!square) {
        break;
      }

      if (square.equals(target)) {
        return true;
      }

      if (board.isOccupied(square)) {
        break;
      }
    }
  }

  return false;
}

function pawnAttacks(piece: Piece, target: Coordinate3D): boolean {
  const rankDirection = piece.color === "white" ? 1 : -1;
  const offsets: readonly Vector[] = [
    [1, rankDirection, 0],
    [-1, rankDirection, 0],
    [1, 0, 1],
    [-1, 0, 1],
  ];

  return attacksByLeap(piece, target, offsets);
}

export function isSquareAttacked(
  board: Board3D,
  target: Coordinate3D,
  byColor: PieceColor,
): boolean {
  return board.getPiecesByColor(byColor).some((piece) => {
    switch (piece.type) {
      case "pawn":
        return pawnAttacks(piece, target);
      case "rook":
        return attacksByRay(board, piece, target, ROOK_DIRECTIONS);
      case "bishop":
        return attacksByRay(board, piece, target, BISHOP_DIRECTIONS);
      case "queen":
        return attacksByRay(board, piece, target, QUEEN_DIRECTIONS);
      case "king":
        return attacksByLeap(piece, target, KING_DIRECTIONS);
      case "knight":
        return attacksByLeap(piece, target, KNIGHT_OFFSETS);
    }
  });
}
