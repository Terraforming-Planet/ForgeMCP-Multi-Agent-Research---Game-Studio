import type { Board3D } from "../board/Board3D.js";
import type { Piece } from "../pieces/Piece.js";
import type { Vector } from "./DirectionVectors.js";
import type { Move } from "./Move.js";
import { createMove } from "./MoveFactory.js";

export function generatePawnMoves(board: Board3D, piece: Piece): Move[] {
  const rankDirection = piece.color === "white" ? 1 : -1;
  // Both armies begin on level A. Vertical pawn progress is always A -> H,
  // independently from the classical rank direction. Pawns never descend.
  const heightDirection = 1;
  const moves: Move[] = [];

  const addQuietMove = (vector: Vector): void => {
    const to = piece.position.tryAdd(...vector);
    if (to && board.isEmpty(to)) moves.push(createMove(piece, to));
  };

  // Normal one-step advances in Cube Chess:
  // classical forward, one level upward, or forward and upward together.
  const rankOne: Vector = [0, rankDirection, 0];
  const heightOne: Vector = [0, 0, heightDirection];
  const forwardAndUp: Vector = [0, rankDirection, heightDirection];
  addQuietMove(rankOne);
  addQuietMove(heightOne);
  addQuietMove(forwardAndUp);

  if (!piece.hasMoved) {
    // Classical two-square opening move. The intermediate square must be free.
    const rankMiddle = piece.position.tryAdd(...rankOne);
    const rankTwo = piece.position.tryAdd(0, rankDirection * 2, 0);
    if (
      rankMiddle &&
      rankTwo &&
      board.isEmpty(rankMiddle) &&
      board.isEmpty(rankTwo)
    ) {
      moves.push(createMove(piece, rankTwo));
    }

    // Cube Chess opening move A -> C (or the equivalent two-level rise).
    // It is not a jump: the intermediate level must also be empty.
    const heightMiddle = piece.position.tryAdd(...heightOne);
    const heightTwo = piece.position.tryAdd(0, 0, heightDirection * 2);
    if (
      heightMiddle &&
      heightTwo &&
      board.isEmpty(heightMiddle) &&
      board.isEmpty(heightTwo)
    ) {
      moves.push(createMove(piece, heightTwo));
    }
  }

  // Captures remain diagonal in either the rank plane or the vertical plane.
  const captureVectors: readonly Vector[] = [
    [1, rankDirection, 0],
    [-1, rankDirection, 0],
    [1, 0, heightDirection],
    [-1, 0, heightDirection],
  ];

  for (const vector of captureVectors) {
    const to = piece.position.tryAdd(...vector);
    const target = to ? board.getPieceAt(to) : undefined;
    if (to && target && target.color !== piece.color) {
      moves.push(createMove(piece, to, target));
    }
  }

  return moves;
}
