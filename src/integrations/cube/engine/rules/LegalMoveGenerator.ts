import type { Board3D } from "../board/Board3D.js";
import {
  generatePseudoLegalMoves,
  generatePseudoLegalMovesForColor,
} from "../moves/MoveGenerator.js";
import type { Move } from "../moves/Move.js";
import type { Piece, PieceColor } from "../pieces/Piece.js";
import { isInCheck } from "./CheckDetector.js";

function leavesOwnKingSafe(
  board: Board3D,
  move: Move,
  color: PieceColor,
): boolean {
  const target = board.getPieceAt(move.to);
  if (target?.type === "king") {
    return false;
  }

  const next = board.clone();
  next.applyMove(move);
  return !isInCheck(next, color);
}

export function generateLegalMovesForPiece(
  board: Board3D,
  piece: Piece,
): Move[] {
  return generatePseudoLegalMoves(board, piece).filter((move) =>
    leavesOwnKingSafe(board, move, piece.color),
  );
}

export function generateLegalMovesForColor(
  board: Board3D,
  color: PieceColor,
): Move[] {
  return generatePseudoLegalMovesForColor(board, color).filter((move) =>
    leavesOwnKingSafe(board, move, color),
  );
}
