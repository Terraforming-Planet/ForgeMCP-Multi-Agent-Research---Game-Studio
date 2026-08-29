import type { Board3D } from "../board/Board3D.js";
import type { Piece, PieceColor } from "../pieces/Piece.js";
import { isSquareAttacked } from "./AttackDetector.js";

export function oppositeColor(color: PieceColor): PieceColor {
  return color === "white" ? "black" : "white";
}

export function findKing(board: Board3D, color: PieceColor): Piece {
  const kings = board
    .getPiecesByColor(color)
    .filter((piece) => piece.type === "king");

  if (kings.length !== 1) {
    throw new Error(`Expected exactly one ${color} king, found ${kings.length}`);
  }

  return kings[0]!;
}

export function isInCheck(board: Board3D, color: PieceColor): boolean {
  const king = findKing(board, color);
  return isSquareAttacked(board, king.position, oppositeColor(color));
}
