import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_TAXONOMY,
  newTaxonomyItemSchema,
  type NewTaxonomyItem,
  type TaxonomyItem,
} from "@/lib/schemas";

type TaxonomyState = {
  items: TaxonomyItem[];
  /** The item whose colour the next brick takes. */
  activeId: string | null;
  addItem: (input: NewTaxonomyItem) => TaxonomyItem;
  removeItem: (id: string) => void;
  updateItem: (id: string, patch: Partial<NewTaxonomyItem>) => void;
  setActive: (id: string) => void;
  /** Move the item at `from` so it sits at index `to`. */
  moveItem: (from: number, to: number) => void;
};

const withIds = (items: NewTaxonomyItem[]): TaxonomyItem[] =>
  items.map((item) => ({ ...item, id: crypto.randomUUID() }));

const defaults = withIds(DEFAULT_TAXONOMY);

/** The user's taxonomy of tracked work, persisted to localStorage. */
export const useTaxonomyStore = create<TaxonomyState>()(
  persist(
    (set) => ({
      items: defaults,
      activeId: defaults[0]?.id ?? null,
      addItem: (input) => {
        const item: TaxonomyItem = {
          ...newTaxonomyItemSchema.parse(input),
          id: crypto.randomUUID(),
        };
        set((s) => ({ items: [...s.items, item], activeId: s.activeId ?? item.id }));
        return item;
      },
      removeItem: (id) =>
        set((s) => {
          const items = s.items.filter((i) => i.id !== id);
          const activeId =
            s.activeId === id ? (items[0]?.id ?? null) : s.activeId;
          return { items, activeId };
        }),
      updateItem: (id, patch) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.id === id ? { ...i, ...newTaxonomyItemSchema.partial().parse(patch) } : i,
          ),
        })),
      setActive: (id) => set({ activeId: id }),
      moveItem: (from, to) =>
        set((s) => {
          if (from === to || from < 0 || from >= s.items.length) return {};
          const items = [...s.items];
          const [moved] = items.splice(from, 1);
          items.splice(Math.max(0, Math.min(to, items.length)), 0, moved);
          return { items };
        }),
    }),
    { name: "runwall-taxonomy", version: 1 },
  ),
);
