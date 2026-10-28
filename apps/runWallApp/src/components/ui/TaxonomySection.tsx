"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { GripVertical, Minus, Plus, X } from "lucide-react";
import {
  BRICK_COLORS,
  colorsForSize,
  getBrickColor,
  type BrickColorList,
} from "@/lib/brick-catalog";
import { confirm } from "@/store/confirm-store";
import { useLayoutStore } from "@/store/layout-store";
import { useTaxonomyStore } from "@/store/taxonomy-store";
import { Chip } from "./Chip";
import { Icon, IconButton } from "./icons";

const NEW_ITEM_LABEL = "New item";

/** Grid of catalogue colour swatches, mixing finishes; one is selected. */
function SwatchPicker({
  swatches,
  value,
  onChange,
}: {
  swatches: BrickColorList;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup">
      {swatches.map((c) => (
        <button
          key={c.id}
          type="button"
          role="radio"
          aria-checked={c.id === value}
          aria-label={c.name}
          title={`${c.name} (${c.finish})`}
          onClick={() => onChange(c.id)}
          className={`h-5 w-5 rounded-sm border bg-white/70 ${c.id === value ? "border-foreground ring-2 ring-foreground/40" : "border-foreground/30"}`}
        >
          <Chip hex={c.hex} finish={c.finish} />
        </button>
      ))}
    </div>
  );
}

/** Label that edits inline: double-click, or `editing` on mount for new items. */
function InlineLabel({
  value,
  active,
  editing,
  onActivate,
  onEdit,
  onSave,
  onDone,
}: {
  value: string;
  active: boolean;
  editing: boolean;
  onActivate: () => void;
  onEdit: () => void;
  onSave: (label: string) => void;
  onDone: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) input.current?.select();
  }, [editing]);

  const commit = () => {
    const next = draft.trim();
    if (next && next !== value) onSave(next);
    onDone();
  };

  if (editing) {
    return (
      <input
        ref={input}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") onDone();
        }}
        className="min-w-0 flex-1 rounded border border-foreground/30 bg-white/80 px-1.5 py-0.5 text-[14px]"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={onActivate}
      onDoubleClick={() => {
        setDraft(value);
        onEdit();
      }}
      aria-pressed={active}
      title="Click to select, double-click to rename"
      className={`min-w-0 flex-1 truncate rounded px-1.5 py-0.5 text-left text-[14px] ${active ? "bg-foreground/10" : "hover:bg-foreground/5"}`}
    >
      {value}
    </button>
  );
}

/**
 * Taxonomy editor: an unlimited, reorderable list of label + colour items.
 * Colours come from the catalogue swatches for the current brick size and
 * mix opaque and transparent plastic. The active item decides the colour of
 * the next brick placed.
 */
export function TaxonomySection() {
  const size = useLayoutStore((s) => s.size);
  const items = useTaxonomyStore((s) => s.items);
  const activeId = useTaxonomyStore((s) => s.activeId);
  const addItem = useTaxonomyStore((s) => s.addItem);
  const removeItem = useTaxonomyStore((s) => s.removeItem);
  const updateItem = useTaxonomyStore((s) => s.updateItem);
  const setActive = useTaxonomyStore((s) => s.setActive);
  const moveItem = useTaxonomyStore((s) => s.moveItem);

  const swatches = colorsForSize(size);
  const [pickingFor, setPickingFor] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const onAdd = () => {
    // Prefer a catalogue colour no item uses yet.
    const used = new Set(items.map((i) => i.colorId));
    const pick =
      swatches.find((c) => !used.has(c.id)) ?? swatches[0] ?? BRICK_COLORS[0];
    const item = addItem({ label: NEW_ITEM_LABEL, colorId: pick.id });
    setActive(item.id);
    setEditingId(item.id);
  };

  const onRemove = async (id: string, name: string) => {
    const ok = await confirm({
      title: `Delete "${name}"?`,
      message: "Bricks already placed keep their colour.",
    });
    if (ok) removeItem(id);
  };

  const onDragStart = (index: number) => (e: DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    setDragFrom(index);
  };
  const onDragOverRow = (index: number) => (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOver !== index) setDragOver(index);
  };
  const onDrop = (index: number) => (e: DragEvent) => {
    e.preventDefault();
    if (dragFrom !== null) moveItem(dragFrom, index);
    setDragFrom(null);
    setDragOver(null);
  };
  const onDragEnd = () => {
    setDragFrom(null);
    setDragOver(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1">
        {items.map((item, index) => {
          const color = getBrickColor(item.colorId);
          const picking = pickingFor === item.id;
          const over = dragOver === index && dragFrom !== null && dragFrom !== index;
          return (
            <li
              key={item.id}
              draggable
              onDragStart={onDragStart(index)}
              onDragOver={onDragOverRow(index)}
              onDrop={onDrop(index)}
              onDragEnd={onDragEnd}
              className={`flex flex-col gap-1.5 rounded ${over ? "outline outline-1 outline-foreground/40" : ""} ${dragFrom === index ? "opacity-40" : ""}`}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="cursor-grab text-foreground/40 active:cursor-grabbing"
                  aria-hidden="true"
                >
                  <Icon icon={GripVertical} />
                </span>
                <button
                  type="button"
                  aria-label={`Change colour, currently ${color?.name ?? item.colorId}`}
                  title={color ? `${color.name} (${color.finish})` : item.colorId}
                  aria-pressed={picking}
                  onClick={() => setPickingFor(picking ? null : item.id)}
                  className={`h-5 w-5 shrink-0 rounded-sm border bg-white/70 ${picking ? "border-foreground ring-2 ring-foreground/40" : "border-foreground/30"}`}
                >
                  <Chip hex={color?.hex ?? "#fff"} finish={color?.finish ?? "opaque"} />
                </button>
                <InlineLabel
                  value={item.label}
                  active={item.id === activeId}
                  editing={editingId === item.id}
                  onActivate={() => setActive(item.id)}
                  onEdit={() => setEditingId(item.id)}
                  onSave={(next) => updateItem(item.id, { label: next })}
                  onDone={() => setEditingId(null)}
                />
                <IconButton
                  icon={Minus}
                  label={`Delete ${item.label}`}
                  variant="danger"
                  size={24}
                  onClick={() => onRemove(item.id, item.label)}
                />
              </div>
              {picking && (
                <div className="flex items-start gap-2 pl-7">
                  <SwatchPicker
                    swatches={swatches}
                    value={item.colorId}
                    onChange={(id) => {
                      updateItem(item.id, { colorId: id });
                      setPickingFor(null);
                    }}
                  />
                  <IconButton
                    icon={X}
                    label="Close colour picker"
                    size={24}
                    onClick={() => setPickingFor(null)}
                  />
                </div>
              )}
            </li>
          );
        })}
        {items.length === 0 && (
          <li className="text-[13px] text-foreground/60">No items yet.</li>
        )}
      </ul>
      <div className="flex justify-center pt-1">
        <IconButton icon={Plus} label="Add item" onClick={onAdd} />
      </div>
    </div>
  );
}
