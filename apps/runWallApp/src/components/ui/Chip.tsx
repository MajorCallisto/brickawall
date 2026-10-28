import type { BrickFinish } from "@/lib/schemas";

/**
 * A colour chip. Opaque plastic is a solid block; transparent plastic shows
 * the colour as tinted glass over a light ground with a highlight.
 */
export function Chip({ hex, finish }: { hex: string; finish: BrickFinish }) {
  if (finish === "opaque") {
    return (
      <span
        className="block h-full w-full rounded-sm"
        style={{
          background: `linear-gradient(160deg, rgba(255,255,255,0.35), rgba(255,255,255,0) 45%), ${hex}`,
        }}
      />
    );
  }
  return (
    <span
      className="block h-full w-full rounded-sm"
      style={{
        background: `linear-gradient(160deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.15) 40%, rgba(255,255,255,0) 60%), ${hex}cc`,
        boxShadow: `inset 0 0 0 1px ${hex}`,
      }}
    />
  );
}
