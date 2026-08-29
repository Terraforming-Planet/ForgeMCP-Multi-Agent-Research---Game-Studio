import { Coordinate3D } from "../coordinates/Coordinate3D.js";
import type { Move } from "../moves/Move.js";
import type { Piece, PieceColor } from "../pieces/Piece.js";

export class Board3D {
  private readonly cells = new Map<string, Piece>();
  public constructor(pieces: readonly Piece[] = []) { pieces.forEach((piece) => this.placePiece(piece)); }
  private key(position: Coordinate3D): string { return position.toSquareAddress(); }
  public getPieceAt(position: Coordinate3D): Piece | undefined { return this.cells.get(this.key(position)); }
  public isEmpty(position: Coordinate3D): boolean { return !this.getPieceAt(position); }
  public isOccupied(position: Coordinate3D): boolean { return !this.isEmpty(position); }
  public isOccupiedByColor(position: Coordinate3D, color: PieceColor): boolean { return this.getPieceAt(position)?.color === color; }
  public placePiece(piece: Piece): void { if (this.isOccupied(piece.position)) throw new Error("Square occupied"); this.cells.set(this.key(piece.position), piece); }
  public removePiece(position: Coordinate3D): Piece { const piece = this.getPieceAt(position); if (!piece) throw new Error("No piece"); this.cells.delete(this.key(position)); return piece; }
  public movePiece(from: Coordinate3D, to: Coordinate3D): Piece {
    if (from.equals(to)) throw new Error("Cannot move to the same square");
    const piece = this.getPieceAt(from); if (!piece) throw new Error("No piece");
    if (this.isOccupied(to)) throw new Error("Destination occupied");
    const moved = { ...piece, position: to, hasMoved: true }; this.cells.delete(this.key(from)); this.cells.set(this.key(to), moved); return moved;
  }
  public applyMove(move: Move): { movedPiece: Piece; capturedPiece?: Piece } {
    const piece = this.getPieceAt(move.from); if (!piece || piece.id !== move.pieceId) throw new Error("Move source mismatch");
    if (move.from.equals(move.to)) throw new Error("Cannot move to the same square");
    const target = this.getPieceAt(move.to);
    if (move.kind === "quiet" && target) throw new Error("Quiet move destination occupied");
    if (move.kind === "capture" && (!target || target.color === piece.color || target.id !== move.capturedPieceId)) throw new Error("Invalid capture");
    const movedPiece = { ...piece, position: move.to, hasMoved: true };
    this.cells.delete(this.key(move.from)); if (target) this.cells.delete(this.key(move.to)); this.cells.set(this.key(move.to), movedPiece);
    return target ? { movedPiece, capturedPiece: target } : { movedPiece };
  }
  public clone(): Board3D { return new Board3D(this.getAllPieces()); }
  public getAllPieces(): Piece[] { return [...this.cells.values()]; }
  public getPiecesByColor(color: PieceColor): Piece[] { return this.getAllPieces().filter((piece) => piece.color === color); }
}
