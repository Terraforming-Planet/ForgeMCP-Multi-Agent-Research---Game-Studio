export class Coordinate3D {
  public readonly x: number; public readonly y: number; public readonly z: number;
  public constructor(x: number, y: number, z: number) {
    this.x=x; this.y=y; this.z=z;
    if (!this.isInsideBoard()) throw new RangeError("Coordinate outside 8x8x8 board");
  }
  public equals(other: Coordinate3D): boolean { return this.x === other.x && this.y === other.y && this.z === other.z; }
  public add(dx: number, dy: number, dz: number): Coordinate3D { return new Coordinate3D(this.x + dx, this.y + dy, this.z + dz); }
  public tryAdd(dx: number, dy: number, dz: number): Coordinate3D | null {
    const x = this.x + dx, y = this.y + dy, z = this.z + dz;
    return [x, y, z].every((value) => Number.isInteger(value) && value >= 0 && value < 8) ? new Coordinate3D(x, y, z) : null;
  }
  public subtract(other: Coordinate3D): { x: number; y: number; z: number } { return { x: this.x - other.x, y: this.y - other.y, z: this.z - other.z }; }
  public isInsideBoard(): boolean { return [this.x, this.y, this.z].every((value) => Number.isInteger(value) && value >= 0 && value < 8); }
  public toSquareAddress(): string { return `${String.fromCharCode(65 + this.z)}:${String.fromCharCode(97 + this.x)}${this.y + 1}`; }
  public static fromSquareAddress(address: string): Coordinate3D { const match = /^([A-H]):([a-h])([1-8])$/.exec(address); if (!match) throw new Error("Invalid square address"); return new Coordinate3D(match[2]!.charCodeAt(0) - 97, Number(match[3]!) - 1, match[1]!.charCodeAt(0) - 65); }
}
