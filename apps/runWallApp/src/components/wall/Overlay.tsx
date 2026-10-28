"use client";

import { useSceneStore } from "@/store/scene-store";
import { TaxonomyIndicator } from "../ui/TaxonomyIndicator";

/** Transition shared by every block; each slides toward its nearest edge. */
const SLIDE = "transition-transform duration-500 ease-in-out";

export function Overlay() {
  const hidden = useSceneStore((s) => s.uiHidden);
  // Letters clear their own height plus the 40px margin they sit in.
  const up = hidden ? "-translate-y-[calc(100%+40px)]" : "";
  const down = hidden ? "translate-y-[calc(100%+40px)]" : "";
  // The top-right block sits 160px in from the edge.
  const right = hidden ? "translate-x-[calc(100%+160px)]" : "";
  const left = hidden ? "-translate-x-[calc(100%+120px)]" : "";
  return (
    <>
      <div className={`char absolute ${SLIDE} ${up}`} style={{ top: 40, left: 40 }}>
        R
      </div>
      <div className={`char absolute ${SLIDE} ${up}`} style={{ top: 40, left: "20vw" }}>
        U
      </div>
      <div className={`char absolute ${SLIDE} ${up}`} style={{ top: 40, left: "40vw" }}>
        N
      </div>
      {/* WALL sits flush right with the same 40px margin RUN has on the left */}
      <div
        className={`absolute right-10 bottom-10 flex gap-[5vw] ${SLIDE} ${down}`}
      >
        {["W", "A", "L", "L"].map((letter, i) => (
          <span key={i} className="char">
            {letter}
          </span>
        ))}
      </div>

      <div className={`absolute top-10 right-40 font-serif text-right text-[15px] ${SLIDE} ${right}`}>
        PROGRESS
        <br />
        BRICK BY BRICK
      </div>

      <div
        data-ui
        className={`absolute bottom-[120px] left-[120px] font-serif text-[18px] ${SLIDE} ${left}`}
      >
        An interactive 3D wall for tracking
        <br />
        the work you put in, brick by brick.
        <br />
        <br />
        <div className="relative mt-2.5 inline-block">
          <a
            className="text-[15px] font-semibold tracking-[2px]"
            href="https://github.com/pmndrs/drei#caustics"
            target="_blank"
            rel="noreferrer"
          >
            BUILT ON DREI CAUSTICS
          </a>
          <div className="mt-1.5 h-[2.5px] w-full bg-foreground" />
        </div>
        <TaxonomyIndicator />
      </div>
    </>
  );
}
