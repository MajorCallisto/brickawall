"use client";

import { useEffect } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTaxonomyStore } from "@/store/taxonomy-store";
import { IconButton } from "./icons";

/** True when the key press belongs to a text field, not the scene. */
const inTextField = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
};

/**
 * Shows the active taxonomy item and cycles it with the left and right
 * arrow keys, or by clicking the key indicators.
 */
export function TaxonomyIndicator() {
  const items = useTaxonomyStore((s) => s.items);
  const activeId = useTaxonomyStore((s) => s.activeId);
  const setActive = useTaxonomyStore((s) => s.setActive);

  const index = Math.max(0, items.findIndex((i) => i.id === activeId));
  const active = items[index];

  const step = (delta: number) => {
    if (items.length === 0) return;
    const next = (index + delta + items.length) % items.length;
    setActive(items[next].id);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (inTextField(e)) return;
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!active) return null;

  return (
    <div className="mt-4 flex flex-col gap-2">
      <div
        role="status"
        aria-live="polite"
        aria-label="Active taxonomy item"
        className="flex items-center gap-2 text-[15px]"
      >
        <span className="tracking-[1px]">{active.label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <IconButton
          icon={ArrowLeft}
          label="Previous taxonomy item (left arrow)"
          size={24}
          className="border border-foreground/30 bg-white/60"
          onClick={() => step(-1)}
        />
        <IconButton
          icon={ArrowRight}
          label="Next taxonomy item (right arrow)"
          size={24}
          className="border border-foreground/30 bg-white/60"
          onClick={() => step(1)}
        />
        <span className="ml-1 text-[12px] tracking-[1px] text-foreground/60 uppercase">
          {index + 1} / {items.length}
        </span>
      </div>
    </div>
  );
}
