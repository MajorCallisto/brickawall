import type { GridCell } from "./grid";
import type { BrickFinish } from "./schemas";

/**
 * What is stored for a brick: its offset from the first brick, measured in
 * brick widths (ux) and brick depths (uz), plus its colour. Offsets are
 * multiples of one half, so the wall keeps its bond when the size changes.
 */
export type StoredBrick = {
  ux: number;
  uz: number;
  color: string;
  /** Plastic finish; older saves without it are transparent. */
  finish?: BrickFinish;
  /** Taxonomy item that placed the brick; older saves match by colour. */
  taxonomyId?: string;
};

/** A stored brick resolved to grid cells, with its derived resting height. */
export type LaidBrick = GridCell & {
  gy: number;
  color: string;
  finish: BrickFinish;
  taxonomyId?: string;
};

export type Cells = readonly [w: number, h: number, d: number];

/** True when two footprints of the same size share any ground cell. */
export function footprintsOverlap(
  a: GridCell,
  b: GridCell,
  w: number,
  d: number,
): boolean {
  return a.gx < b.gx + w && b.gx < a.gx + w && a.gz < b.gz + d && b.gz < a.gz + d;
}

/** Offset of a cell from the origin, in brick widths and depths. */
export function toRelative(
  cell: GridCell,
  origin: GridCell,
  [w, , d]: Cells,
): { ux: number; uz: number } {
  return { ux: (cell.gx - origin.gx) / w, uz: (cell.gz - origin.gz) / d };
}

/** Absolute anchor cell of a relative offset at the given brick size. */
export function toCell(
  brick: { ux: number; uz: number },
  origin: GridCell,
  [w, , d]: Cells,
): GridCell {
  return {
    gx: origin.gx + Math.round(brick.ux * w),
    gz: origin.gz + Math.round(brick.uz * d),
  };
}

/**
 * Resolves stored bricks to cells and derives every height from placement
 * order: each brick lands on top of the highest earlier brick whose footprint
 * overlaps its own, or on the ground. Order, origin and size are enough to
 * rebuild the whole wall.
 */
export function layoutBricks(
  bricks: readonly StoredBrick[],
  origin: GridCell,
  cells: Cells,
): LaidBrick[] {
  const [w, h, d] = cells;
  const laid: LaidBrick[] = [];
  for (const brick of bricks) {
    const cell = toCell(brick, origin, cells);
    const gy = laid
      .filter((b) => footprintsOverlap(b, cell, w, d))
      .reduce((top, b) => Math.max(top, b.gy + h), 0);
    laid.push({
      ...cell,
      gy,
      color: brick.color,
      finish: brick.finish ?? "transparent",
      taxonomyId: brick.taxonomyId,
    });
  }
  return laid;
}
