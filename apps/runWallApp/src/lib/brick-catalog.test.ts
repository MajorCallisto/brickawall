import { describe, expect, it } from "vitest";
import {
  BRICK_COLORS,
  BRICK_SIZES,
  availableWidths,
  colorsForSize,
  findByProductId,
  getBrickColor,
  getVariant,
  isCatalogSize,
  lengthsForWidth,
  parseBrickSize,
  sizesForColor,
  sizeToCells,
} from "./brick-catalog";
import { brickColorSchema, brickSizeIdSchema } from "./schemas";

describe("brick catalogue", () => {
  it("lists the fifteen supported sizes", () => {
    expect(BRICK_SIZES).toHaveLength(15);
    for (const size of BRICK_SIZES) {
      expect(brickSizeIdSchema.safeParse(size).success).toBe(true);
    }
  });

  it("has unique colour ids and valid entries", () => {
    const ids = BRICK_COLORS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const color of BRICK_COLORS) {
      expect(brickColorSchema.safeParse(color).success).toBe(true);
      for (const variant of color.variants) {
        expect(BRICK_SIZES).toContain(variant.size);
      }
    }
  });

  it("gives every product a unique id, one per colour and size", () => {
    const productIds = BRICK_COLORS.flatMap((c) =>
      c.variants.map((v) => v.productId),
    );
    expect(new Set(productIds).size).toBe(productIds.length);
    for (const color of BRICK_COLORS) {
      const sizes = color.variants.map((v) => v.size);
      expect(new Set(sizes).size).toBe(sizes.length);
    }
  });

  it("looks products up by colour and size, and by product id", () => {
    const variant = getVariant("red", "2x4");
    expect(variant?.size).toBe("2x4");
    expect(variant?.productId).toBeTruthy();
    expect(getVariant("red", "9x9")).toBeUndefined();
    const found = findByProductId(variant!.productId);
    expect(found?.color.id).toBe("red");
    expect(found?.variant.size).toBe("2x4");
    expect(findByProductId("nope")).toBeUndefined();
  });

  it("queries colours by size and finish", () => {
    const all = colorsForSize("1x1");
    const opaque = colorsForSize("1x1", "opaque");
    const transparent = colorsForSize("1x1", "transparent");
    expect(opaque.length + transparent.length).toBe(all.length);
    expect(opaque.every((c) => c.finish === "opaque")).toBe(true);
    expect(colorsForSize("9x9")).toEqual([]);
  });

  it("queries sizes by colour", () => {
    expect(sizesForColor("trans-red").length).toBeGreaterThan(0);
    expect(sizesForColor("no-such-colour")).toEqual([]);
    expect(getBrickColor("red")?.hex).toBe("#c91a09");
  });

  it("exposes widths and the lengths available for each", () => {
    expect(availableWidths()).toEqual([1, 2]);
    expect(lengthsForWidth(1)).toEqual([1, 2, 3, 4, 6, 8, 10, 12, 16]);
    expect(lengthsForWidth(2)).toEqual([2, 3, 4, 6, 8, 10]);
    expect(lengthsForWidth(3)).toEqual([]);
    expect(isCatalogSize("2x4")).toBe(true);
    expect(isCatalogSize("3x5")).toBe(false);
  });

  it("converts stud sizes to grid cells with length along x", () => {
    expect(parseBrickSize("2x4")).toEqual({ width: 2, length: 4 });
    expect(sizeToCells("1x1")).toEqual([2, 3.6, 2]);
    expect(sizeToCells("1x3")).toEqual([6, 3.6, 2]);
    expect(sizeToCells("2x4")).toEqual([8, 3.6, 4]);
  });
});
