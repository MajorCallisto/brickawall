"use client";

import * as THREE from "three";
import { useMemo, useRef, useState } from "react";
import { easing } from "maath";
import { Line } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { footprintCenter, toGridCell, toWorld, type GridCell } from "@/lib/grid";
import { useSceneStore } from "@/store/scene-store";

type GroundCursorProps = {
  /** World-space height of the ground plane. */
  y?: number;
  /** Footprint in grid units, width along x and depth along z. */
  size?: [number, number];
  color?: string;
  /** Approximate time in seconds for the outline to settle on a new cell. */
  smoothTime?: number;
  /** Called with the cell the outline is showing when the ground is clicked. */
  onPlace?: (cell: GridCell) => void;
  /**
   * Adjusts the cell under the pointer before it is shown or placed, so the
   * outline previews exactly where a brick will land under any constraints.
   */
  constrain?: (cell: GridCell) => GridCell;
};

/**
 * Projects the 2D pointer onto the ground plane and draws a rectangular
 * stroke on the grid cell under it.
 *
 * The cell is recomputed every frame from the last pointer position and the
 * current camera, not once per pointer event. The camera keeps drifting for
 * a moment after the pointer stops, so a per-event cell would fall out of
 * step with what is under the pointer. A click places at the cell the
 * outline is showing, so what you see is what you get.
 */
export function GroundCursor({
  y = 0,
  size = [1, 1],
  color = "#3e3e3d",
  smoothTime = 0.12,
  onPlace,
  constrain = (cell) => cell,
}: GroundCursorProps) {
  const cursor = useRef<THREE.Group>(null!);
  const [visible, setVisible] = useState(false);
  const idle = useSceneStore((s) => s.pointerIdle);
  const [gw, gd] = size;
  const w = toWorld(gw);
  const d = toWorld(gd);

  const target = useRef(new THREE.Vector3());
  const cell = useRef<GridCell | null>(null);
  const hovering = useRef(false);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const ground = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), -y),
    [y],
  );
  const hit = useMemo(() => new THREE.Vector3(), []);

  // The invisible plane only tells us whether the pointer is over the
  // ground and when it is clicked; the position comes from the frame loop.
  const onPointerMove = () => {
    hovering.current = true;
  };
  const onPointerLeave = () => {
    hovering.current = false;
    cell.current = null;
    setVisible(false);
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    // Overlay controls inside the event source mark themselves data-ui so a
    // click on them does not also place a brick underneath.
    const domTarget = e.nativeEvent.target as HTMLElement | null;
    if (domTarget?.closest?.("[data-ui]")) return;
    if (cell.current) onPlace?.(cell.current);
  };

  useFrame((state, delta) => {
    if (hovering.current) {
      raycaster.setFromCamera(state.pointer, state.camera);
      if (raycaster.ray.intersectPlane(ground, hit)) {
        const next = constrain({ gx: toGridCell(hit.x), gz: toGridCell(hit.z) });
        const [x, z] = footprintCenter(next, gw, gd);
        target.current.set(x, y + 0.002, z);
        if (!cell.current) {
          // Appear in place rather than sliding in from the last position.
          cursor.current.position.copy(target.current);
          setVisible(true);
        }
        cell.current = next;
      }
    }
    // Ease toward the snapped cell instead of jumping to it.
    easing.damp3(cursor.current.position, target.current, smoothTime, delta);
  });

  return (
    <>
      <mesh
        position-y={y}
        rotation-x={-Math.PI / 2}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onClick={onClick}
      >
        <planeGeometry args={[60, 60]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      <group ref={cursor} visible={visible && !idle}>
        <Line
          points={[
            [-w / 2, 0, -d / 2],
            [w / 2, 0, -d / 2],
            [w / 2, 0, d / 2],
            [-w / 2, 0, d / 2],
            [-w / 2, 0, -d / 2],
          ]}
          color={color}
          lineWidth={2}
        />
      </group>
    </>
  );
}
