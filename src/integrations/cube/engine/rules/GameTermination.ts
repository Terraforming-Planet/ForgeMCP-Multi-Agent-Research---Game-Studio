import type { Board3D } from "../board/Board3D.js";
import type { PieceColor } from "../pieces/Piece.js";
import { isInCheck } from "./CheckDetector.js";
import { generateLegalMovesForColor } from "./LegalMoveGenerator.js";

export type PositionStatus =
  | { readonly kind: "active"; readonly inCheck: boolean }
  | { readonly kind: "checkmate"; readonly winner: PieceColor }
  | { readonly kind: "stalemate" };

export function evaluatePosition(
  board: Board3D,
  sideToMove: PieceColor,
): PositionStatus {
  const inCheck = isInCheck(board, sideToMove);
  const legalMoves = generateLegalMovesForColor(board, sideToMove);

  if (legalMoves.length > 0) {
    return { kind: "active", inCheck };
  }

  if (inCheck) {
    return {
      kind: "checkmate",
      winner: sideToMove === "white" ? "black" : "white",
    };
  }

  return { kind: "stalemate" };
}
