import type { Coordinate3D } from "../coordinates/Coordinate3D.js";
import type { Piece } from "../pieces/Piece.js";
import type { Move } from "./Move.js";

export function createMove(piece: Piece, to: Coordinate3D, target?: Piece): Move {
  return target
    ? { pieceId: piece.id, from: piece.position, to, capturedPieceId: target.id, kind: "capture" }
    : { pieceId: piece.id, from: piece.position, to, kind: "quiet" };
}
