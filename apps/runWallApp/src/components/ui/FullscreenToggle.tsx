"use client";

import { useEffect } from "react";
import { Maximize, Minimize } from "lucide-react";
import { useSceneStore } from "@/store/scene-store";
import { IconButton } from "./icons";

export const APP_VERSION = "v0.1";

/** Pause after the viewport resizes, for the browser's fullscreen zoom. */
const SETTLE_MS = 300;
/** Give up waiting for a resize after this long. */
const SETTLE_TIMEOUT_MS = 1500;

/**
 * Top-right fullscreen control, with the version indicator beneath it.
 * Clicking asks the browser for fullscreen and, once that has settled,
 * slides every UI layer out; clicking again, pressing
 * Escape, or leaving browser fullscreen restores the UI.
 */
export function FullscreenToggle() {
  const hidden = useSceneStore((s) => s.uiHidden);
  const setHidden = useSceneStore((s) => s.setUiHidden);

  /**
   * Resolves once the browser has finished entering fullscreen: after the
   * request settles and the viewport has resized, plus a beat for the
   * browser's own zoom transition. Falls through on a timeout.
   */
  const fullscreenSettled = () =>
    new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        window.removeEventListener("resize", onResize);
        setTimeout(resolve, SETTLE_MS);
      };
      const onResize = () => finish();
      window.addEventListener("resize", onResize);
      setTimeout(finish, SETTLE_TIMEOUT_MS);
    });

  const enter = async () => {
    try {
      const request = document.documentElement.requestFullscreen?.();
      if (request) {
        const settled = fullscreenSettled();
        await request;
        await settled;
      }
    } catch {
      // Fullscreen can be refused (iframes, headless); hiding the UI still works.
    }
    setHidden(true);
  };

  const exit = async () => {
    setHidden(false);
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // Nothing to do; the UI is already back.
      }
    }
  };

  useEffect(() => {
    if (!hidden) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHidden(false);
    };
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setHidden(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [hidden, setHidden]);

  return (
    // Sits where the example's dash was: first line of the top-right block,
    // with the version as the second line, matching the block to its left.
    <div
      className={`absolute top-10 right-10 z-20 flex flex-col items-end font-serif text-[15px] leading-[22px] transition-opacity duration-500 ${hidden ? "opacity-30 hover:opacity-100" : "opacity-100"}`}
    >
      <IconButton
        icon={hidden ? Minimize : Maximize}
        label={hidden ? "Show interface" : "Hide interface and go fullscreen"}
        size={22}
        className="-mr-1"
        onClick={hidden ? exit : enter}
      />
      <span
        className={`tabular-nums transition-transform duration-500 ease-in-out ${hidden ? "translate-x-[calc(100%+40px)]" : ""}`}
      >
        {APP_VERSION}
      </span>
    </div>
  );
}
