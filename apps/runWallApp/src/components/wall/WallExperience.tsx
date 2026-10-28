"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { useSceneStore } from "@/store/scene-store";
import { Overlay } from "./Overlay";

// The three.js canvas touches window and WebGL, so it is client-only.
const WallCanvas = dynamic(
  () => import("./WallCanvas").then((mod) => mod.WallCanvas),
  { ssr: false },
);

// UI reads persisted localStorage state, so it is client-only too.
const Sidebar = dynamic(
  () => import("../ui/Sidebar").then((mod) => mod.Sidebar),
  { ssr: false },
);
const FullscreenToggle = dynamic(
  () => import("../ui/FullscreenToggle").then((mod) => mod.FullscreenToggle),
  { ssr: false },
);
const ConfirmDialog = dynamic(
  () => import("../ui/ConfirmDialog").then((mod) => mod.ConfirmDialog),
  { ssr: false },
);

/** Pointer stillness before the cursor and indicator hide, in ms. */
const IDLE_MS = 5_000;

export function WallExperience() {
  // Pointer events are captured on this wrapper (not the canvas) so that the
  // HTML overlay does not block camera movement. Mirrors the pmndrs example,
  // which used the #root element for the same purpose.
  const eventSource = useRef<HTMLDivElement>(null!);
  // In-scene HTML (the brick delete button) is portalled here, outside the
  // event source, so its clicks never reach the canvas pointer handlers.
  const uiLayer = useRef<HTMLDivElement>(null!);
  const pointerIdle = useSceneStore((s) => s.pointerIdle);
  const setPointerIdle = useSceneStore((s) => s.setPointerIdle);

  // After IDLE_MS without pointer movement, hide the mouse cursor and the
  // ground indicator; any movement brings them back.
  useEffect(() => {
    let timer = setTimeout(() => setPointerIdle(true), IDLE_MS);
    const onMove = () => {
      setPointerIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setPointerIdle(true), IDLE_MS);
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointermove", onMove);
    };
  }, [setPointerIdle]);

  return (
    <div
      className={`relative h-dvh w-full overflow-hidden ${pointerIdle ? "cursor-none" : ""}`}
    >
      <div ref={eventSource} className="absolute inset-0">
        <WallCanvas eventSource={eventSource} uiLayer={uiLayer} />
        <Overlay />
      </div>
      <div ref={uiLayer} className="pointer-events-none absolute inset-0 z-10" />
      {/* Outside the event source so sidebar clicks never reach the canvas */}
      <Sidebar />
      <FullscreenToggle />
      <ConfirmDialog />
    </div>
  );
}
