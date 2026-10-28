import { create } from "zustand";
import { persist } from "zustand/middleware";
import { sizeToCells } from "@/lib/brick-catalog";
import type { GridCell } from "@/lib/grid";
import type { BrickFinish, BrickSizeId } from "@/lib/schemas";
import { toRelative, type StoredBrick } from "@/lib/wall-layout";

type LayoutState = {
  /** Global brick size, applied to every brick in the wall. */
  size: BrickSizeId;
  /** Size requested by the UI, applied by the scene after the out animation. */
  pendingSize: BrickSizeId | null;
  /** Anchor cell of the first brick; every offset is measured from it. */
  origin: GridCell | null;
  /** Bricks in placement order as offsets in brick widths. Height is derived. */
  bricks: StoredBrick[];
  addBrick: (
    cell: GridCell,
    color: string,
    finish: BrickFinish,
    taxonomyId?: string,
  ) => void;
  /** Remove one brick by its index in placement order. */
  removeBrick: (index: number) => void;
  /**
   * Move a brick to a new cell. It leaves its slot and is re-added last, so
   * it lands on top of whatever now overlaps that cell.
   */
  moveBrick: (index: number, cell: GridCell) => void;
  requestSize: (size: BrickSizeId) => void;
  applyPendingSize: () => void;
  clear: () => void;
};

type PersistedV1 = {
  size: BrickSizeId;
  bricks: { gx: number; gz: number; color: string }[];
};

/**
 * The wall as saved between visits: one size, an origin cell, and an ordered
 * list of relative offsets with colours. Persisted to localStorage.
 */
export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      size: "2x2",
      pendingSize: null,
      origin: null,
      bricks: [],
      addBrick: (cell, color, finish, taxonomyId) =>
        set((s) => {
          const origin = s.origin ?? cell;
          const { ux, uz } = toRelative(cell, origin, sizeToCells(s.size));
          return {
            origin,
            bricks: [...s.bricks, { ux, uz, color, finish, taxonomyId }],
          };
        }),
      removeBrick: (index) =>
        set((s) => {
          const bricks = s.bricks.filter((_, i) => i !== index);
          // The origin cell stays as the reference while any brick remains.
          return { bricks, origin: bricks.length ? s.origin : null };
        }),
      moveBrick: (index, cell) =>
        set((s) => {
          const brick = s.bricks[index];
          if (!brick || !s.origin) return {};
          const { ux, uz } = toRelative(cell, s.origin, sizeToCells(s.size));
          const bricks = s.bricks.filter((_, i) => i !== index);
          bricks.push({ ...brick, ux, uz });
          return { bricks };
        }),
      requestSize: (size) => set({ pendingSize: size }),
      applyPendingSize: () =>
        set((s) => ({ size: s.pendingSize ?? s.size, pendingSize: null })),
      clear: () => set({ origin: null, bricks: [] }),
    }),
    {
      name: "runwall-layout",
      version: 2,
      partialize: (s) => ({ size: s.size, origin: s.origin, bricks: s.bricks }),
      migrate: (persisted, version) => {
        if (version < 2) {
          // v1 stored absolute cells; re-express them relative to the first.
          const v1 = persisted as PersistedV1;
          const origin = v1.bricks[0] ?? null;
          const cells = sizeToCells(v1.size);
          return {
            size: v1.size,
            origin: origin && { gx: origin.gx, gz: origin.gz },
            bricks: origin
              ? v1.bricks.map((b) => ({ ...toRelative(b, origin, cells), color: b.color }))
              : [],
          };
        }
        return persisted;
      },
    },
  ),
);
