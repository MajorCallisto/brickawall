import {
  brickColorSchema,
  type BrickColor,
  type BrickFinish,
  type BrickSizeId,
  type BrickVariant,
} from "./schemas";

/**
 * Brick catalogue: the sizes bricks come in, the colours they can be made
 * in, and which sizes each colour is available for.
 *
 * Sizes are in studs, written width x length. Colours carry the list of
 * variants they are produced in, one per size, each with its product id, so
 * a colour shared by several sizes is stored once. Query helpers below
 * answer both directions.
 */

export const BRICK_SIZES = [
  "1x1",
  "1x2",
  "1x3",
  "1x4",
  "1x6",
  "1x8",
  "1x10",
  "1x12",
  "1x16",
  "2x2",
  "2x3",
  "2x4",
  "2x6",
  "2x8",
  "2x10",
] as const satisfies readonly BrickSizeId[];

export type BrickSize = (typeof BRICK_SIZES)[number];

/**
 * Grid cells per stud along the ground. Two cells per stud keeps half-brick
 * offsets on the grid; at a 0.05 cell one stud is 0.1 world units.
 */
export const CELLS_PER_STUD = 2;

/**
 * Every brick is 1.8 studs tall, so a 1x1 is 1 by 1 by 1.8 studs. Height
 * need not be a whole number of cells; stacking accumulates it exactly.
 */
export const BRICK_HEIGHT_STUDS = 1.8;
export const BRICK_HEIGHT_CELLS = BRICK_HEIGHT_STUDS * CELLS_PER_STUD;

/** Parse "2x4" into its stud dimensions. */
export function parseBrickSize(id: BrickSizeId): {
  width: number;
  length: number;
} {
  const [width, length] = id.split("x").map(Number);
  return { width, length };
}

/**
 * Footprint and height of a size in grid cells: [x, y, z]. Bricks lie with
 * their length along x and their width along z.
 */
export function sizeToCells(id: BrickSizeId): [number, number, number] {
  const { width, length } = parseBrickSize(id);
  return [length * CELLS_PER_STUD, BRICK_HEIGHT_CELLS, width * CELLS_PER_STUD];
}

/** Distinct widths in the catalogue, ascending. */
export function availableWidths(): number[] {
  return [...new Set(BRICK_SIZES.map((s) => parseBrickSize(s).width))].sort(
    (a, b) => a - b,
  );
}

/** Lengths the catalogue offers for a width, ascending. */
export function lengthsForWidth(width: number): number[] {
  return BRICK_SIZES.map(parseBrickSize)
    .filter((s) => s.width === width)
    .map((s) => s.length)
    .sort((a, b) => a - b);
}

/** True when the width and length pair is a catalogue size. */
export function isCatalogSize(id: string): id is BrickSize {
  return (BRICK_SIZES as readonly string[]).includes(id);
}

/**
 * Placeholder variants for the starter palette: every size, with a product
 * id that is obviously not real. Replace with the actual per-size lists.
 */
const allSizes = (colorId: string): BrickVariant[] =>
  BRICK_SIZES.map((size) => ({ size, productId: `TBD-${colorId}-${size}` }));

/**
 * Starter palette. Names and hex values follow common brick colour naming.
 * Availability and product ids are placeholders until the real data is
 * entered.
 */
export const BRICK_COLORS: BrickColor[] = [
  // Opaque
  { id: "white", name: "White", hex: "#ffffff", finish: "opaque", variants: allSizes("white") },
  { id: "black", name: "Black", hex: "#05131d", finish: "opaque", variants: allSizes("black") },
  { id: "red", name: "Red", hex: "#c91a09", finish: "opaque", variants: allSizes("red") },
  { id: "blue", name: "Blue", hex: "#0055bf", finish: "opaque", variants: allSizes("blue") },
  { id: "yellow", name: "Yellow", hex: "#f2cd37", finish: "opaque", variants: allSizes("yellow") },
  { id: "green", name: "Green", hex: "#237841", finish: "opaque", variants: allSizes("green") },
  { id: "bright-green", name: "Bright Green", hex: "#4b9f4a", finish: "opaque", variants: allSizes("bright-green") },
  { id: "lime", name: "Lime", hex: "#bbe90b", finish: "opaque", variants: allSizes("lime") },
  { id: "orange", name: "Orange", hex: "#fe8a18", finish: "opaque", variants: allSizes("orange") },
  { id: "dark-red", name: "Dark Red", hex: "#720e0f", finish: "opaque", variants: allSizes("dark-red") },
  { id: "dark-blue", name: "Dark Blue", hex: "#0a3463", finish: "opaque", variants: allSizes("dark-blue") },
  { id: "dark-green", name: "Dark Green", hex: "#184632", finish: "opaque", variants: allSizes("dark-green") },
  { id: "medium-azure", name: "Medium Azure", hex: "#36aebf", finish: "opaque", variants: allSizes("medium-azure") },
  { id: "bright-pink", name: "Bright Pink", hex: "#e4adc8", finish: "opaque", variants: allSizes("bright-pink") },
  { id: "magenta", name: "Magenta", hex: "#923978", finish: "opaque", variants: allSizes("magenta") },
  { id: "tan", name: "Tan", hex: "#e4cd9e", finish: "opaque", variants: allSizes("tan") },
  { id: "reddish-brown", name: "Reddish Brown", hex: "#582a12", finish: "opaque", variants: allSizes("reddish-brown") },
  { id: "light-bluish-gray", name: "Light Bluish Gray", hex: "#a0a5a9", finish: "opaque", variants: allSizes("light-bluish-gray") },
  { id: "dark-bluish-gray", name: "Dark Bluish Gray", hex: "#6c6e68", finish: "opaque", variants: allSizes("dark-bluish-gray") },
  { id: "sand-green", name: "Sand Green", hex: "#a0bcac", finish: "opaque", variants: allSizes("sand-green") },

  // Transparent
  { id: "trans-clear", name: "Trans-Clear", hex: "#fcfcfc", finish: "transparent", variants: allSizes("trans-clear") },
  { id: "trans-red", name: "Trans-Red", hex: "#c91a09", finish: "transparent", variants: allSizes("trans-red") },
  { id: "trans-dark-blue", name: "Trans-Dark Blue", hex: "#0020a0", finish: "transparent", variants: allSizes("trans-dark-blue") },
  { id: "trans-light-blue", name: "Trans-Light Blue", hex: "#aeefec", finish: "transparent", variants: allSizes("trans-light-blue") },
  { id: "trans-yellow", name: "Trans-Yellow", hex: "#f5cd2f", finish: "transparent", variants: allSizes("trans-yellow") },
  { id: "trans-green", name: "Trans-Green", hex: "#84b68d", finish: "transparent", variants: allSizes("trans-green") },
  { id: "trans-orange", name: "Trans-Orange", hex: "#f08f1c", finish: "transparent", variants: allSizes("trans-orange") },
  { id: "trans-purple", name: "Trans-Purple", hex: "#a5a5cb", finish: "transparent", variants: allSizes("trans-purple") },
  { id: "trans-black", name: "Trans-Black", hex: "#635f52", finish: "transparent", variants: allSizes("trans-black") },
];

/** Validate the catalogue once at load so a bad entry fails loudly. */
brickColorSchema.array().parse(BRICK_COLORS);

const byId = new Map(BRICK_COLORS.map((c) => [c.id, c]));

export function getBrickColor(id: string): BrickColor | undefined {
  return byId.get(id);
}

export type BrickColorList = BrickColor[];

/** Colours available for a size, optionally limited to one finish. */
export function colorsForSize(
  size: BrickSizeId,
  finish?: BrickFinish,
): BrickColor[] {
  return BRICK_COLORS.filter(
    (c) =>
      c.variants.some((v) => v.size === size) &&
      (finish === undefined || c.finish === finish),
  );
}

/** Sizes a colour is available in. */
export function sizesForColor(id: string): BrickSizeId[] {
  return byId.get(id)?.variants.map((v) => v.size) ?? [];
}

/** The product for a colour in a size, if it exists. */
export function getVariant(
  colorId: string,
  size: BrickSizeId,
): BrickVariant | undefined {
  return byId.get(colorId)?.variants.find((v) => v.size === size);
}

/** Look a product up by its id across the whole catalogue. */
export function findByProductId(
  productId: string,
): { color: BrickColor; variant: BrickVariant } | undefined {
  for (const color of BRICK_COLORS) {
    const variant = color.variants.find((v) => v.productId === productId);
    if (variant) return { color, variant };
  }
  return undefined;
}
