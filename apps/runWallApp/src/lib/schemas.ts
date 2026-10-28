import { z } from "zod";

/**
 * Domain schemas shared by the client store, server actions and API routes.
 * Keep these as the single source of truth for validation.
 */

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Expected a hex colour like #ff8800");

/** Brick footprint in studs, written width x length, e.g. "2x4". */
export const brickSizeIdSchema = z
  .string()
  .regex(/^[1-9]\d*x[1-9]\d*$/, 'Expected a size like "2x4"');

export const brickFinishSchema = z.enum(["opaque", "transparent"]);

/** One purchasable brick: a colour in a given size, with its product id. */
export const brickVariantSchema = z.object({
  size: brickSizeIdSchema,
  productId: z.string().trim().min(1),
});

/** A colour a brick can be made in, and the sizes (products) it comes in. */
export const brickColorSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, "Expected a kebab-case id"),
  name: z.string().trim().min(1),
  hex: hexColorSchema,
  finish: brickFinishSchema,
  variants: z.array(brickVariantSchema).min(1),
});

export type BrickSizeId = z.infer<typeof brickSizeIdSchema>;
export type BrickFinish = z.infer<typeof brickFinishSchema>;
export type BrickVariant = z.infer<typeof brickVariantSchema>;
export type BrickColor = z.infer<typeof brickColorSchema>;

/**
 * A category of tracked work, e.g. "Easy run". Each item is a label and a
 * catalogue colour; the brick colour is looked up from the catalogue.
 */
export const taxonomyItemSchema = z.object({
  id: z.uuid(),
  label: z.string().trim().min(1).max(60),
  colorId: z.string().regex(/^[a-z0-9-]+$/),
});

export const newTaxonomyItemSchema = taxonomyItemSchema.omit({ id: true });

export type TaxonomyItem = z.infer<typeof taxonomyItemSchema>;
export type NewTaxonomyItem = z.infer<typeof newTaxonomyItemSchema>;

/** The default taxonomy from "The Bricks" (see docs/reference). */
export const DEFAULT_TAXONOMY: NewTaxonomyItem[] = [
  { label: "Easy run", colorId: "green" },
  { label: "Session", colorId: "red" },
  { label: "Long run", colorId: "blue" },
  { label: "Cross-training", colorId: "orange" },
  { label: "Strength and conditioning", colorId: "magenta" },
  { label: "Rest day", colorId: "light-bluish-gray" },
];
