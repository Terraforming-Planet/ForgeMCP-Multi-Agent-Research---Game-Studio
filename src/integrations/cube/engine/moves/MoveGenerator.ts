import type { Board3D } from "../board/Board3D.js";
import type { Piece, PieceColor } from "../pieces/Piece.js";
import {
  BISHOP_DIRECTIONS,
  KING_DIRECTIONS,
  KNIGHT_OFFSETS,
  QUEEN_DIRECTIONS,
  ROOK_DIRECTIONS,
} from "./DirectionVectors.js";
import { generateLeapingMoves } from "./LeapingMoveGenerator.js";
import type { Move } from "./Move.js";
import { generatePawnMoves } from "./PawnMoveGenerator.js";
import { generateSlidingMoves } from "./SlidingMoveGenerator.js";

export function generatePseudoLegalMoves(board: Board3D, piece: Piece): Move[] {
  switch (piece.type) {
    case "rook":
      return generateSlidingMoves(board, piece, ROOK_DIRECTIONS);
    case "bishop":
      return generateSlidingMoves(board, piece, BISHOP_DIRECTIONS);
    case "queen":
      return generateSlidingMoves(board, piece, QUEEN_DIRECTIONS);
    case "king":
      return generateLeapingMoves(board, piece, KING_DIRECTIONS);
    case "knight":
      return generateLeapingMoves(board, piece, KNIGHT_OFFSETS);
    case "pawn":
      return generatePawnMoves(board, piece);
  }
}

export function generatePseudoLegalMovesForColor(
  board: Board3D,
  color: PieceColor,
): Move[] {
  return board
    .getPiecesByColor(color)
    .flatMap((piece) => generatePseudoLegalMoves(board, piece));
}
