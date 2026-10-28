"use client";

import * as THREE from "three";
import { useMemo, useRef, useState } from "react";
import { easing } from "maath";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Edges, MeshTransmissionMaterial } from "@react-three/drei";
import type { BrickFinish } from "@/lib/schemas";

type BrickProps = {
  /** World-space centre of the brick once it has landed. */
  position: [number, number, number];
  /** Shared shell geometry, built once by the placer. */
  geometry: THREE.BufferGeometry;
  environment: THREE.Texture | null;
  /** Glass tint or plastic colour. White is clear glass. */
  color?: string;
  /** Transparent bricks refract like the glass; opaque ones are plastic. */
  finish?: BrickFinish;
  /** How far above the landing point the brick starts, in world units. */
  dropHeight?: number;
  /** Duration of the drop in seconds. */
  duration?: number;
  /** Called once, when the drop animation completes. */
  onLanded?: () => void;
  /** Seconds to wait before starting the drop. */
  delay?: number;
  /** When true, the brick lifts back up and out instead of resting. */
  leaving?: boolean;
  /** Draws a selection outline. */
  selected?: boolean;
  /** Click handler; the click does not fall through to the ground. */
  onSelect?: () => void;
  /** Pointer-down handler, used to start a drag. */
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
  /** Hides the mesh, e.g. while a drag preview stands in for it. */
  hidden?: boolean;
  /** Pointer enters or leaves the brick. */
  onHover?: (hovered: boolean) => void;
  /** When set, x eases toward its target over roughly this many seconds. */
  smoothX?: number;
};

/** How close x must be to its target before the height follows, in world units. */
const X_SETTLED = 0.004;

/** Duration of the lift-out animation in seconds. */
const LEAVE_DURATION = 0.5;

const easeInCubic = (x: number) => x * x * x;

/** Standard ease-out bounce: settles with a few decaying bounces. */
function easeOutBounce(x: number) {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
  if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
  return n1 * (x -= 2.625 / d1) * x + 0.984375;
}

/**
 * A clear brick that drops from above and bounces into place. Uses the same
 * transmission material as the glass in the scene.
 */
export function Brick({
  position,
  geometry,
  environment,
  color = "#ffffff",
  finish = "transparent",
  dropHeight = 1.5,
  duration = 0.9,
  onLanded,
  delay = 0,
  leaving = false,
  selected = false,
  onSelect,
  onPointerDown,
  hidden = false,
  onHover,
  smoothX,
}: BrickProps) {
  const mesh = useRef<THREE.Mesh>(null!);
  // Selection edges in the brick's own hue: saturated and bright, so they
  // read against both the brick and the pale background.
  const highlight = useMemo(() => {
    const hsl = { h: 0, s: 0, l: 0 };
    new THREE.Color(color).getHSL(hsl);
    const s = hsl.s < 0.15 ? hsl.s : Math.max(hsl.s, 0.85);
    return new THREE.Color().setHSL(hsl.h, s, hsl.s < 0.15 ? 0.35 : 0.55);
  }, [color]);
  const startedAt = useRef<number | null>(null);
  const leaveStartedAt = useRef<number | null>(null);
  const landed = useRef(false);
  const [x, landY, z] = position;

  // The mesh owns its position: the prop only seeds it once, so later prop
  // updates (a move, a reorder) never snap a landed brick back into the air.
  const [initial] = useState(() => [x, landY + dropHeight, z] as const);

  useFrame(({ clock }, delta) => {
    const m = mesh.current;
    const now = clock.elapsedTime;

    // Horizontal: follow the target, eased when asked to. While easing, a
    // rise happens before the slide (so the brick clears what it crosses)
    // and a fall happens after it (so it drops onto the new stack).
    if (smoothX !== undefined) easing.damp(m.position, "x", x, smoothX, delta);
    else m.position.x = x;
    m.position.z = z;
    const xSettled = smoothX === undefined || Math.abs(m.position.x - x) < X_SETTLED;
    const mayFollowY = xSettled || landY > m.position.y;

    // Vertical: lift-out, resting, instant placement, or the drop.
    if (leaving) {
      if (leaveStartedAt.current === null) leaveStartedAt.current = now;
      const t = Math.min((now - leaveStartedAt.current) / LEAVE_DURATION, 1);
      const from = landed.current ? landY : m.position.y;
      m.position.y = from + dropHeight * easeInCubic(t);
      return;
    }
    if (landed.current) {
      if (mayFollowY) m.position.y = landY;
      return;
    }
    if (dropHeight === 0) {
      if (!mayFollowY) return;
      m.position.y = landY;
      landed.current = true;
      onLanded?.();
      return;
    }
    if (startedAt.current === null) startedAt.current = now + delay;
    if (now < startedAt.current) return;
    const t = Math.min((now - startedAt.current) / duration, 1);
    m.position.y = landY + dropHeight * (1 - easeOutBounce(t));
    if (t === 1) {
      landed.current = true;
      onLanded?.();
    }
  });

  return (
    <mesh
      ref={mesh}
      geometry={geometry}
      position={initial}
      castShadow
      visible={!hidden}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onSelect?.();
      }}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onPointerDown?.(e);
      }}
      onPointerOver={() => onHover?.(true)}
      onPointerOut={() => onHover?.(false)}
    >
      {selected && <Edges lineWidth={2.5} color={highlight} />}
      {finish === "opaque" ? (
        // Moulded plastic: matte body with a light clearcoat sheen.
        <meshPhysicalMaterial
          color={color}
          roughness={0.35}
          clearcoat={0.6}
          clearcoatRoughness={0.3}
          envMap={environment}
          envMapIntensity={0.6}
        />
      ) : (
      <MeshTransmissionMaterial
        // Matches the glass: soft, blurred highlights rather than mirror-sharp.
        // backside refracts through the inner walls of the shell as well.
        color={color}
        backside
        backsideThickness={0.1}
        thickness={0.05}
        chromaticAberration={0.05}
        anisotropicBlur={1}
        clearcoat={1}
        clearcoatRoughness={1}
        envMap={environment}
        envMapIntensity={2}
      />
      )}
    </mesh>
  );
}
