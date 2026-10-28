"use client";

import type { ButtonHTMLAttributes } from "react";
import type { LucideIcon, LucideProps } from "lucide-react";

/**
 * Icon convention for the whole UI.
 *
 * - Every icon comes from lucide-react, drawn at ICON_SIZE with ICON_STROKE.
 * - Clickable icons are always an <IconButton>: a square hit target, a
 *   required accessible label (also shown as a tooltip), and one of three
 *   variants. Never wrap an icon in a bare <button>.
 * - Decorative or inline icons use <Icon>, which is hidden from assistive
 *   technology because the surrounding text carries the meaning.
 * - No text glyphs (x, <, >) stand in for icons.
 */
export const ICON_SIZE = 16;
export const ICON_STROKE = 1.75;

type IconProps = Omit<LucideProps, "size" | "strokeWidth"> & {
  icon: LucideIcon;
  size?: number;
};

export function Icon({ icon: Glyph, size = ICON_SIZE, ...rest }: IconProps) {
  return (
    <Glyph
      size={size}
      strokeWidth={ICON_STROKE}
      aria-hidden="true"
      focusable="false"
      {...rest}
    />
  );
}

type Variant = "ghost" | "solid" | "danger";

const VARIANT: Record<Variant, string> = {
  ghost:
    "text-foreground/60 hover:bg-foreground/10 hover:text-foreground disabled:hover:bg-transparent",
  solid: "bg-foreground text-background hover:bg-foreground/85",
  danger:
    "text-foreground/60 hover:bg-red-600/10 hover:text-red-700 disabled:hover:bg-transparent",
};

type IconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label" | "title" | "children"
> & {
  icon: LucideIcon;
  /** Accessible name and tooltip. Required. */
  label: string;
  variant?: Variant;
  /** Hit target in px; the glyph stays at ICON_SIZE. */
  size?: number;
};

export function IconButton({
  icon,
  label,
  variant = "ghost",
  size = 28,
  className = "",
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      style={{ width: size, height: size }}
      className={`inline-flex shrink-0 items-center justify-center rounded transition-colors disabled:opacity-40 ${VARIANT[variant]} ${className}`}
      {...rest}
    >
      <Icon icon={icon} />
    </button>
  );
}
