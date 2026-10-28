/**
 * Grid language for the wall.
 *
 * The scene is laid out on a conceptual grid. Positions and sizes in the
 * domain are expressed in grid units; the renderer converts them to world
 * units. One grid unit is 0.05 world units: half a stud, so every brick
 * size has an exact half-brick offset on the grid.
 */
export const GRID_UNIT = 0.05;

/** Grid units to world units. */
export const toWorld = (grid: number) => grid * GRID_UNIT;

/** World units to a grid cell index (floored). */
export const toGridCell = (world: number) => Math.floor(world / GRID_UNIT);

/** A ground cell on the grid, the minimum-corner anchor of a footprint. */
export type GridCell = { gx: number; gz: number };

/** World-space centre of a `w` by `d` footprint anchored at a cell. */
export function footprintCenter(
  cell: GridCell,
  w: number,
  d: number,
): [number, number] {
  return [toWorld(cell.gx + w / 2), toWorld(cell.gz + d / 2)];
}
