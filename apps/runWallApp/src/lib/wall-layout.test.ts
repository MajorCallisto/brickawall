import { describe, expect, it } from "vitest";
import {
  footprintsOverlap,
  layoutBricks,
  toCell,
  toRelative,
} from "./wall-layout";

const origin = { gx: 10, gz: 4 };
const cells = [4, 2, 4] as const;

describe("wall layout", () => {
  it("detects overlapping and touching footprints", () => {
    expect(footprintsOverlap({ gx: 0, gz: 0 }, { gx: 3, gz: 0 }, 4, 4)).toBe(true);
    expect(footprintsOverlap({ gx: 0, gz: 0 }, { gx: 4, gz: 0 }, 4, 4)).toBe(false);
    expect(footprintsOverlap({ gx: 0, gz: 0 }, { gx: 0, gz: 4 }, 4, 4)).toBe(false);
  });

  it("converts between cells and offsets in brick widths", () => {
    expect(toRelative({ gx: 12, gz: 4 }, origin, cells)).toEqual({ ux: 0.5, uz: 0 });
    expect(toRelative({ gx: 6, gz: 8 }, origin, cells)).toEqual({ ux: -1, uz: 1 });
    expect(toCell({ ux: 0.5, uz: 0 }, origin, cells)).toEqual({ gx: 12, gz: 4 });
    // The same offset at a bigger brick lands further out, keeping the bond.
    expect(toCell({ ux: 0.5, uz: 0 }, origin, [8, 2, 4])).toEqual({ gx: 14, gz: 4 });
  });

  it("stacks later bricks on the highest overlapping earlier brick", () => {
    const laid = layoutBricks(
      [
        { ux: 0, uz: 0, color: "a" },
        { ux: 0.5, uz: 0, color: "b" }, // overlaps a: lands on it
        { ux: 1, uz: 0, color: "c" }, // touches a, overlaps b: on b
        { ux: 3, uz: 0, color: "d" }, // alone: ground
        { ux: 0.25, uz: 0, color: "e" }, // overlaps a, b and c: on c
      ],
      origin,
      cells,
    );
    expect(laid.map((b) => b.gy)).toEqual([0, 2, 4, 0, 6]);
    expect(laid[1]).toMatchObject({ gx: 12, gz: 4 });
  });

  it("keeps relative positions across a size change", () => {
    const bricks = [
      { ux: 0, uz: 0, color: "a" },
      { ux: 0.5, uz: 0, color: "b" },
    ];
    const small = layoutBricks(bricks, origin, [2, 1, 2]);
    const big = layoutBricks(bricks, origin, [8, 3, 4]);
    expect(small.map((b) => b.gy)).toEqual([0, 1]);
    expect(big.map((b) => b.gy)).toEqual([0, 3]);
    expect(small[1].gx - origin.gx).toBe(1);
    expect(big[1].gx - origin.gx).toBe(4);
    expect(layoutBricks([], origin, cells)).toEqual([]);
  });
});
