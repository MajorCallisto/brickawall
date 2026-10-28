"use client";

import * as THREE from "three";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type RefObject,
} from "react";
import { useThree } from "@react-three/fiber";
import { AccumulativeShadows, Caustics, Html } from "@react-three/drei";
import { Minus } from "lucide-react";
import { IconButton } from "@/components/ui/icons";
import { confirm } from "@/store/confirm-store";
import { toGridCell, toWorld, type GridCell } from "@/lib/grid";
import { getBrickColor, sizeToCells } from "@/lib/brick-catalog";
import { ShellBoxGeometry } from "@/lib/three/ShellBoxGeometry";
import { footprintsOverlap, layoutBricks, type LaidBrick } from "@/lib/wall-layout";
import { useLayoutStore } from "@/store/layout-store";
import { useSceneStore } from "@/store/scene-store";
import { useTaxonomyStore } from "@/store/taxonomy-store";
import { Brick } from "./Brick";
import { GroundCursor } from "./GroundCursor";
import { WallLabel } from "./WallLabel";
import { useSceneEnvironment } from "./useSceneEnvironment";

/** Wall thickness of the hollow brick, in grid units (0.025 world). */
const WALL_CELLS = 0.5;

/** How long bricks take to lift out before a size change, in ms. */
const LEAVE_MS = 550;

/** Stagger between bricks dropping back in after a size change, in seconds. */
const REENTER_STAGGER = 0.04;

/**
 * Placement constraints, all relative to the first brick placed (the origin).
 * Held as state so a UI can toggle them later.
 *
 * lockZ: every brick lands on the origin's z row, building one wall face.
 * halfBrickX: x snaps to the origin's x plus whole multiples of half a brick
 * width, so bricks sit flush or offset by half, as in a running bond.
 */
export type PlacementConstraints = {
  lockZ: boolean;
  halfBrickX: boolean;
};

const DEFAULT_CONSTRAINTS: PlacementConstraints = {
  lockZ: true,
  halfBrickX: true,
};

type BrickPlacerProps = {
  /** World-space height of the ground plane. */
  groundY: number;
  /** Accumulative shadow catcher to re-bake when a brick lands. */
  shadows?: RefObject<ComponentRef<typeof AccumulativeShadows> | null>;
  /** Container outside the pointer event source for in-scene HTML. */
  uiLayer: RefObject<HTMLElement>;
};

/**
 * The glass sets its caustics light in a group rotated -0.75 rad about y.
 * Bricks live at the scene root, so the same direction is rotated to match.
 */
const CAUSTICS_LIGHT = new THREE.Vector3(-1.2, 3, -2)
  .applyAxisAngle(new THREE.Vector3(0, 1, 0), -0.75)
  .toArray() as [number, number, number];

const causticsLegacyProps = {
  backfaces: true,
  frustum: 1.75,
  backfaceIor: 1.26,
};

/** Caustic light colour for a brick colour: the tint, lifted toward white. */
function causticTint(hex: string): [number, number, number] {
  return new THREE.Color(hex).lerp(new THREE.Color("white"), 0.4).toArray() as [
    number,
    number,
    number,
  ];
}

/**
 * Shows the grid cursor and drops a brick where it sits on click. The wall
 * itself lives in the persisted layout store as an origin plus relative
 * offsets; cells and heights are derived by the layout rules each render.
 */
export function BrickPlacer({ groundY, shadows, uiLayer }: BrickPlacerProps) {
  const size = useLayoutStore((s) => s.size);
  const pendingSize = useLayoutStore((s) => s.pendingSize);
  const origin = useLayoutStore((s) => s.origin);
  const stored = useLayoutStore((s) => s.bricks);
  const addBrick = useLayoutStore((s) => s.addBrick);
  const applyPendingSize = useLayoutStore((s) => s.applyPendingSize);
  const removeBrick = useLayoutStore((s) => s.removeBrick);
  const moveBrick = useLayoutStore((s) => s.moveBrick);
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const activeId = useTaxonomyStore((s) => s.activeId);
  const items = useTaxonomyStore((s) => s.items);
  const setAccentColor = useSceneStore((s) => s.setAccentColor);
  const [constraints] = useState<PlacementConstraints>(DEFAULT_CONSTRAINTS);
  const environment = useSceneEnvironment();
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const [drag, setDrag] = useState<{ index: number; cell: GridCell; moved: boolean } | null>(null);
  // A brick placed by a drag appears in place rather than dropping in. It
  // is re-added last, so its key after the move is the final index.
  const [settledKey, setSettledKey] = useState<string | null>(null);
  // fiber counts the ground among a drag's pointer-down hits, so the release
  // also arrives as a ground click. Ignore placements right after a drag.
  const dragEndedAt = useRef(0);

  const cells = useMemo(() => sizeToCells(size), [size]);
  const [w, h, d] = cells;
  // One geometry shared by every brick, rebuilt only when the size changes.
  const geometry = useMemo(
    () =>
      new ShellBoxGeometry(toWorld(w), toWorld(h), toWorld(d), toWorld(WALL_CELLS)),
    [w, h, d],
  );
  const bricks = useMemo(
    () => (origin ? layoutBricks(stored, origin, cells) : []),
    [stored, origin, cells],
  );

  // Transparent bricks go in one Caustics per colour, since a Caustics
  // component has a single tint. Opaque bricks cast no caustics.
  const { groups, opaque } = useMemo(() => {
    const byColor = new Map<string, { brick: LaidBrick; index: number }[]>();
    const opaque: { brick: LaidBrick; index: number }[] = [];
    bricks.forEach((brick, index) => {
      if (brick.finish === "opaque") {
        opaque.push({ brick, index });
        return;
      }
      const list = byColor.get(brick.color) ?? [];
      list.push({ brick, index });
      byColor.set(brick.color, list);
    });
    return { groups: [...byColor.entries()], opaque };
  }, [bricks]);

  const constrain = (cell: GridCell): GridCell => {
    if (!origin) return cell;
    let { gx, gz } = cell;
    if (constraints.lockZ) gz = origin.gz;
    if (constraints.halfBrickX) {
      const step = Math.max(1, Math.round(w / 2));
      gx = origin.gx + Math.round((gx - origin.gx) / step) * step;
    }
    return { gx, gz };
  };

  // Size change: lift every brick out, then apply the size so they remount
  // and drop back in at the new dimensions.
  const leaving = pendingSize !== null && stored.length > 0;
  useEffect(() => {
    if (pendingSize === null) return;
    if (stored.length === 0) {
      applyPendingSize();
      return;
    }
    const t = setTimeout(applyPendingSize, LEAVE_MS);
    return () => clearTimeout(t);
  }, [pendingSize, stored.length, applyPendingSize]);

  /**
   * Re-bake the soft shadows. The bake lights a Lambert catcher, and once
   * the Environment has set scene.environment that image-based light fills
   * the catcher evenly, so the bake comes out blank. Remove it for the bake.
   */
  const rebakeShadows = (delayMs = 0) => {
    const api = shadows?.current;
    if (!api) return;
    setTimeout(() => {
      const env = scene.environment;
      scene.environment = null;
      api.reset();
      api.update(100);
      scene.environment = env;
    }, delayMs);
  };

  // Bricks removed (Clear) leave stale shadows behind; re-bake once they
  // have unmounted. Landing bricks re-bake through onLanded.
  const count = stored.length;
  const previousCount = useRef(count);
  useEffect(() => {
    if (count < previousCount.current) rebakeShadows();
    previousCount.current = count;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  /** Colour of the active taxonomy item: the next brick and the cursor. */
  const active = items.find((i) => i.id === activeId) ?? items[0];
  const activeCatalog = getBrickColor(active?.colorId ?? "");
  const activeColor = activeCatalog?.hex ?? "#3e3e3d";
  const activeFinish = activeCatalog?.finish ?? "transparent";

  // The environment lighting follows the active colour as soon as it changes.
  useEffect(() => setAccentColor(activeColor), [activeColor, setAccentColor]);

  // Escape clears the selection. An index past the end (after a removal or
  // Clear) simply counts as no selection.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const selectedIndex =
    selected !== null && selected < bricks.length ? selected : null;

  const onDelete = async (index: number) => {
    const ok = await confirm({
      title: "Delete this brick?",
      message: "Bricks resting on it will settle onto whatever is below.",
    });
    if (ok) removeBrick(index);
    setSelected(null);
  };

  /** Ground cell under a DOM pointer position, with constraints applied. */
  const cellAtPointer = (clientX: number, clientY: number): GridCell | null => {
    const rect = gl.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, camera);
    const hit = new THREE.Vector3();
    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), -groundY);
    if (!raycaster.ray.intersectPlane(ground, hit)) return null;
    return constrain({ gx: toGridCell(hit.x), gz: toGridCell(hit.z) });
  };

  const startDrag = (index: number) => () => {
    if (leaving) return;
    const brick = bricks[index];
    setDrag({ index, cell: { gx: brick.gx, gz: brick.gz }, moved: false });
  };

  // While dragging, track the pointer on the window so the drag survives
  // leaving the canvas, and commit on release.
  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      const cell = cellAtPointer(e.clientX, e.clientY);
      if (!cell) return;
      setDrag((d) =>
        d && (d.cell.gx !== cell.gx || d.cell.gz !== cell.gz)
          ? { ...d, cell, moved: true }
          : d,
      );
    };
    const onUp = () => {
      const original = bricks[drag.index];
      const changed =
        drag.moved && (drag.cell.gx !== original.gx || drag.cell.gz !== original.gz);
      if (changed) {
        setSettledKey(`${size}:${bricks.length - 1}`);
        moveBrick(drag.index, drag.cell);
        // The moved brick reuses a landed component, so no landing fires;
        // re-bake once the next frame has moved the meshes.
        rebakeShadows(60);
      } else {
        setSelected(drag.index);
      }
      dragEndedAt.current = performance.now();
      setDrag(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, bricks, moveBrick, size]);

  /** Height of the dragged brick: resting on the highest brick under it. */
  const dragRestY = (index: number, cell: GridCell) => {
    const top = bricks
      .filter((b, i) => i !== index && footprintsOverlap(b, cell, w, d))
      .reduce((t, b) => Math.max(t, b.gy + h), 0);
    return toWorld(top + h / 2);
  };



  const place = (cell: GridCell) => {
    if (leaving) return;
    if (performance.now() - dragEndedAt.current < 300) return;
    // With a brick selected, a ground click only clears the selection.
    if (selectedIndex !== null) {
      setSelected(null);
      return;
    }
    addBrick(cell, activeColor, activeFinish, active?.id);
  };

  const last = bricks.length - 1;

  /** Taxonomy label for a brick: by id, else by matching colour and finish. */
  const labelFor = (brick: LaidBrick | undefined) => {
    if (!brick) return "";
    const byId = items.find((i) => i.id === brick.taxonomyId);
    if (byId) return byId.label;
    const byColor = items.find((i) => {
      const c = getBrickColor(i.colorId);
      return c?.hex === brick.color && c.finish === brick.finish;
    });
    return byColor?.label ?? "";
  };
  const hoveredBrick = hovered !== null ? bricks[hovered] : undefined;
  const label = labelFor(hoveredBrick);
  // Behind the wall: centred on the bricks' x span, one row back.
  const xs = bricks.map((b) => toWorld(b.gx + w / 2));
  const labelX = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : 0;
  const labelZ = origin ? toWorld(origin.gz) - 1.2 : -1.2;

  const renderBrick = ({ brick, index }: { brick: LaidBrick; index: number }) => (
    <Brick
      // Keyed by size so a size change remounts every brick.
      key={`${size}:${index}`}
      geometry={geometry}
      color={brick.color}
      finish={brick.finish}
      environment={environment}
      leaving={leaving}
      dropHeight={settledKey === `${size}:${index}` ? 0 : undefined}
      selected={index === selectedIndex}
      onSelect={() => setSelected(index)}
      onPointerDown={startDrag(index)}
      onHover={(over) => setHovered((h) => (over ? index : h === index ? null : h))}
      hidden={drag?.index === index && drag.moved}
      delay={index * REENTER_STAGGER}
      onLanded={index === last ? () => rebakeShadows() : undefined}
      position={[
        toWorld(brick.gx + w / 2),
        toWorld(brick.gy + h / 2),
        toWorld(brick.gz + d / 2),
      ]}
    />
  );

  return (
    <>
      <GroundCursor
        y={groundY}
        size={[w, d]}
        color={activeColor}
        onPlace={place}
        constrain={constrain}
      />
      {groups.map(([color, members]) => (
        <Caustics
          key={color}
          // Same setup as the glass, tinted per colour. frames=Infinity
          // because bricks are added and move; the plane sits at y = 0 here.
          position-y={groundY}
          frames={Infinity}
          causticsOnly={false}
          backside={false}
          color={causticTint(color)}
          lightSource={CAUSTICS_LIGHT}
          intensity={0.01}
          worldRadius={0.26 / 10}
          ior={0.9}
          {...causticsLegacyProps}
        >
          {members.map(renderBrick)}
        </Caustics>
      ))}
      {/* Opaque bricks skip caustics but share the same ground offset */}
      <group position-y={groundY}>{opaque.map(renderBrick)}</group>
      {/* Text suspends while its font loads; keep that inside the Canvas */}
      <Suspense fallback={null}>
        <WallLabel
          text={label}
          visible={hovered !== null && label !== "" && !drag}
          position={[labelX, groundY + 0.001, labelZ]}
        />
      </Suspense>
      {drag?.moved && bricks[drag.index] && (
        <group position-y={groundY}>
          <Brick
            key="drag-preview"
            geometry={geometry}
            color={bricks[drag.index].color}
            finish={bricks[drag.index].finish}
            environment={environment}
            dropHeight={0}
            smoothX={0.03}
            position={[
              toWorld(drag.cell.gx + w / 2),
              dragRestY(drag.index, drag.cell),
              toWorld(drag.cell.gz + d / 2),
            ]}
          />
        </group>
      )}
      {selectedIndex !== null && (
        <Html
          portal={uiLayer}
          center
          zIndexRange={[20, 20]}
          position={[
            toWorld(bricks[selectedIndex].gx + w / 2),
            toWorld(bricks[selectedIndex].gy + h) + groundY + 0.06,
            toWorld(bricks[selectedIndex].gz + d / 2),
          ]}
        >
          <div className="pointer-events-auto rounded-full border border-foreground/20 bg-white/80 shadow backdrop-blur-sm">
            <IconButton
              icon={Minus}
              label="Delete brick"
              variant="danger"
              onClick={() => onDelete(selectedIndex)}
            />
          </div>
        </Html>
      )}
    </>
  );
}
