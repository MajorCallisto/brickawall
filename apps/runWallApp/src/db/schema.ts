import {
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/** A category of tracked work with a colour. One row per taxonomy entry. */
export const brickTypes = pgTable("brick_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 60 }).notNull(),
  color: varchar("color", { length: 7 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** One completed item, placed as a brick in the wall. */
export const bricks = pgTable("bricks", {
  id: uuid("id").primaryKey().defaultRandom(),
  brickTypeId: uuid("brick_type_id")
    .notNull()
    .references(() => brickTypes.id, { onDelete: "cascade" }),
  placedAt: timestamp("placed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  note: text("note"),
});

export type BrickTypeRow = typeof brickTypes.$inferSelect;
export type BrickRow = typeof bricks.$inferSelect;
