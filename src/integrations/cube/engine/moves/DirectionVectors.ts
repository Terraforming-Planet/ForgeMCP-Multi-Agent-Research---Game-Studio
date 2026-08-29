export type Vector = readonly [number, number, number];

const signs = [-1, 0, 1] as const;

const ALL_DIRECTIONS: readonly Vector[] = signs
  .flatMap((x) => signs.flatMap((y) => signs.map((z) => [x, y, z] as Vector)))
  .filter(([x, y, z]) => x !== 0 || y !== 0 || z !== 0);

function changedAxisCount(vector: Vector): number {
  return vector.filter((value) => value !== 0).length;
}

export const ROOK_DIRECTIONS: readonly Vector[] = ALL_DIRECTIONS.filter(
  (vector) => changedAxisCount(vector) === 1,
);

/**
 * Cube Chess bishop geometry.
 *
 * The bishop keeps its classical x-y diagonal and may transfer that same
 * diagonal through height. Therefore it may move:
 * - on x-y diagonals while z stays unchanged,
 * - on full x-y-z spatial diagonals.
 *
 * x-z and y-z rays are excluded because they turn a straight horizontal move
 * into a diagonal merely by adding height, which is not a bishop move in this
 * ruleset.
 */
export const BISHOP_DIRECTIONS: readonly Vector[] = ALL_DIRECTIONS.filter(
  ([x, y, z]) =>
    (x !== 0 && y !== 0 && z === 0) ||
    (x !== 0 && y !== 0 && z !== 0),
);

/**
 * The queen is the unrestricted sliding piece in Cube Chess.
 *
 * It keeps every classical rook and bishop ray and may transfer those rays
 * through height, so it can slide and capture along all 26 non-zero 3D
 * directions. Restricting bishop geometry must never remove queen-only x-z or
 * y-z spatial diagonals.
 */
export const QUEEN_DIRECTIONS: readonly Vector[] = ALL_DIRECTIONS;

// The king may move one square in every adjacent 3D direction.
export const KING_DIRECTIONS: readonly Vector[] = ALL_DIRECTIONS;

export const KNIGHT_OFFSETS: readonly Vector[] = [-2, -1, 0, 1, 2]
  .flatMap((x) =>
    [-2, -1, 0, 1, 2].flatMap((y) =>
      [-2, -1, 0, 1, 2].map((z) => [x, y, z] as Vector),
    ),
  )
  .filter(
    (vector) =>
      [...vector].map(Math.abs).sort().join(",") === "0,1,2",
  );
