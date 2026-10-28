"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { ChevronRight, Eraser, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import {
  availableWidths,
  isCatalogSize,
  lengthsForWidth,
  parseBrickSize,
} from "@/lib/brick-catalog";
import { confirm } from "@/store/confirm-store";
import { useLayoutStore } from "@/store/layout-store";
import { useSceneStore } from "@/store/scene-store";
import { Icon, IconButton } from "./icons";
import { TaxonomySection } from "./TaxonomySection";

const WIDTHS = availableWidths();

/** The collapsed tab fades after this long without attention, in ms. */
const FADE_AFTER_MS = 3000;
/** Bringing the pointer this close to the left edge reveals the tab. */
const REVEAL_PX = 50;

/** Collapsible section of the sidebar. */
function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group border-t border-foreground/15 pt-3 first:border-t-0 first:pt-0"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between text-[13px] tracking-[2px] uppercase select-none">
        {title}
        <span className="text-foreground/50 transition-transform group-open:rotate-90">
          <Icon icon={ChevronRight} />
        </span>
      </summary>
      <div className="pt-3">{children}</div>
    </details>
  );
}

/** Brick size chooser, limited to catalogue sizes. */
function SizeSection() {
  const size = useLayoutStore((s) => s.size);
  const count = useLayoutStore((s) => s.bricks.length);
  const requestSize = useLayoutStore((s) => s.requestSize);
  const clear = useLayoutStore((s) => s.clear);
  const [width, setWidth] = useState(() => parseBrickSize(size).width);
  const [length, setLength] = useState(() => parseBrickSize(size).length);

  const lengths = lengthsForWidth(width);
  const requested = `${width}x${length}`;
  const valid = isCatalogSize(requested);

  const onWidthChange = (w: number) => {
    setWidth(w);
    // Keep the length if this width offers it, otherwise the nearest option.
    const options = lengthsForWidth(w);
    if (!options.includes(length)) {
      setLength(
        options.reduce((best, o) =>
          Math.abs(o - length) < Math.abs(best - length) ? o : best,
        ),
      );
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (valid) requestSize(requested);
  };

  const onClear = async () => {
    const ok = await confirm({
      title: "Clear the wall?",
      message: `All ${count} ${count === 1 ? "brick" : "bricks"} will be removed.`,
      confirmLabel: "Clear",
    });
    if (ok) clear();
  };

  const field =
    "w-20 rounded border border-foreground/30 bg-white/70 px-2 py-1 text-right text-[15px] tabular-nums";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="flex items-center justify-between gap-2 text-[15px]">
        Width
        <select
          className={field}
          value={width}
          onChange={(e) => onWidthChange(Number(e.target.value))}
        >
          {WIDTHS.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center justify-between gap-2 text-[15px]">
        Length
        <select
          className={field}
          value={length}
          onChange={(e) => setLength(Number(e.target.value))}
        >
          {lengths.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={!valid || requested === size}
        className="mt-1 rounded bg-foreground px-3 py-1.5 text-[13px] tracking-[2px] text-background uppercase disabled:opacity-40"
      >
        Go
      </button>
      <div className="flex items-center justify-between text-[13px] text-foreground/70">
        <span>
          {size} · {count} {count === 1 ? "brick" : "bricks"}
        </span>
        <IconButton
          icon={Eraser}
          label="Clear the wall"
          variant="danger"
          size={24}
          disabled={count === 0}
          onClick={onClear}
        />
      </div>
    </form>
  );
}

/**
 * Left-hand drawer holding the wall controls. Collapses to a single tab,
 * which fades after a few seconds and returns when the pointer comes near
 * the left edge of the screen.
 */
export function Sidebar() {
  const [open, setOpen] = useState(false);
  const [awake, setAwake] = useState(true);
  const uiHidden = useSceneStore((s) => s.uiHidden);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Show the collapsed tab and restart its fade timer. */
  const wake = useCallback(() => {
    setAwake(true);
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    fadeTimer.current = setTimeout(() => setAwake(false), FADE_AFTER_MS);
  }, []);

  useEffect(() => {
    if (open) return;
    // Collapsed: arm the fade, and wake when the pointer nears the left edge.
    fadeTimer.current = setTimeout(() => setAwake(false), FADE_AFTER_MS);
    const onMove = (e: PointerEvent) => {
      if (e.clientX <= REVEAL_PX) wake();
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
  }, [open, wake]);

  const shown = open || awake;

  return (
    <aside
      onPointerEnter={() => !open && wake()}
      className={`absolute top-1/2 left-0 z-10 font-serif transition-[opacity,transform] duration-500 ease-in-out ${shown ? "opacity-100" : "opacity-0"} ${uiHidden ? "-translate-x-[calc(100%+16px)] -translate-y-1/2" : "-translate-y-1/2"}`}
    >
      <div className="flex items-center">
        <div
          className={`overflow-hidden transition-[width] duration-300 ${open ? "w-64" : "w-0"}`}
        >
          <div className="flex max-h-[80vh] w-64 flex-col gap-3 overflow-y-auto rounded-r-lg border border-l-0 border-foreground/20 bg-white/60 p-4 backdrop-blur-sm">
            <Section title="Brick size">
              <SizeSection />
            </Section>
            <Section title="Taxonomy">
              <TaxonomySection />
            </Section>
          </div>
        </div>
        {open ? (
          <div className="flex items-center rounded-r-lg border border-l-0 border-foreground/20 bg-white/60 px-1 backdrop-blur-sm">
            <IconButton
              icon={PanelLeftClose}
              label="Collapse sidebar"
              onClick={() => {
                setAwake(true);
                setOpen(false);
              }}
            />
          </div>
        ) : (
          // Collapsed: a lone solid icon, no tab.
          <IconButton
            icon={PanelLeftOpen}
            label="Expand sidebar"
            variant="solid"
            size={32}
            className="ml-3 shadow"
            onClick={() => {
              setAwake(true);
              setOpen(true);
            }}
          />
        )}
      </div>
    </aside>
  );
}
