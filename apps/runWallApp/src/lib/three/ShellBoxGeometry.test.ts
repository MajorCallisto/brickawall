import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { ShellBoxGeometry } from "./ShellBoxGeometry";

const FACES = 14;

describe("ShellBoxGeometry", () => {
  it("builds 14 flat faces from 56 vertices at one segment each", () => {
    const g = new ShellBoxGeometry(0.6, 0.2, 0.2, 0.05, 1, 1, 1, 0);
    expect(g.getAttribute("position").count).toBe(FACES * 4);
    expect(g.getIndex()?.count).toBe(FACES * 6);
    expect(g.groups).toHaveLength(FACES);
  });

  it("has unit, axis-aligned normals without a bevel", () => {
    const g = new ShellBoxGeometry(0.6, 0.2, 0.2, 0.05, 1, 1, 1, 0);
    const n = g.getAttribute("normal");
    for (let i = 0; i < n.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(n, i);
      expect(v.length()).toBeCloseTo(1);
      expect([Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)].sort()).toEqual([
        0, 0, 1,
      ]);
    }
  });

  it("winds every triangle to face along its stored normal", () => {
    const g = new ShellBoxGeometry(0.6, 0.2, 0.2, 0.05, 2, 3, 2, 0.01, 2);
    const pos = g.getAttribute("position");
    const nor = g.getAttribute("normal");
    const idx = g.getIndex()!;
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const face = new THREE.Vector3();
    for (let i = 0; i < idx.count; i += 3) {
      a.fromBufferAttribute(pos, idx.getX(i));
      b.fromBufferAttribute(pos, idx.getX(i + 1));
      c.fromBufferAttribute(pos, idx.getX(i + 2));
      face.subVectors(b, a).cross(c.clone().sub(a));
      const stored = new THREE.Vector3().fromBufferAttribute(nor, idx.getX(i));
      expect(face.dot(stored)).toBeGreaterThan(0);
    }
  });

  it("treats width, height and depth as exterior dimensions", () => {
    const g = new ShellBoxGeometry(0.6, 0.4, 0.2, 0.05, 1, 1, 1, 0);
    g.computeBoundingBox();
    const size = new THREE.Vector3();
    g.boundingBox!.getSize(size);
    expect(size.x).toBeCloseTo(0.6);
    expect(size.y).toBeCloseTo(0.4);
    expect(size.z).toBeCloseTo(0.2);
    // The cavity is inset by the wall: its widest x extent is width - 2t.
    const pos = g.getAttribute("position");
    let innerMaxX = 0;
    for (let i = 0; i < pos.count; i++) {
      const x = Math.abs(pos.getX(i));
      if (x < 0.3 - 1e-9) innerMaxX = Math.max(innerMaxX, x);
    }
    expect(innerMaxX).toBeCloseTo(0.3 - 0.05);
  });

  it("leaves the bottom open: no face lies in the cavity floor", () => {
    const g = new ShellBoxGeometry(1, 1, 1, 0.1);
    const pos = g.getAttribute("position");
    let insideBottom = 0;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const x = Math.abs(pos.getX(i));
      const z = Math.abs(pos.getZ(i));
      // A vertex on the bottom plane strictly inside the walls would mean a floor.
      if (y === -0.5 && x < 0.4 - 1e-9 && z < 0.4 - 1e-9) insideBottom++;
    }
    expect(insideBottom).toBe(0);
  });

  it("clamps wall thickness to the valid range and warns", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(new ShellBoxGeometry(1, 1, 1, -1).parameters.wallThickness).toBe(
      ShellBoxGeometry.MIN_WALL_THICKNESS,
    );
    expect(new ShellBoxGeometry(0.6, 0.2, 0.2, 5).parameters.wallThickness).toBe(
      0.1,
    );
    expect(new ShellBoxGeometry(1, 0.05, 1, 1).parameters.wallThickness).toBe(
      0.05,
    );
    expect(warn).toHaveBeenCalledTimes(3);
    warn.mockRestore();
    expect(new ShellBoxGeometry(1, 1, 1, 0.1).parameters.wallThickness).toBe(
      0.1,
    );
  });

  it("scales vertex count with segments like BoxGeometry", () => {
    const g = new ShellBoxGeometry(1, 1, 1, 0.1, 2, 2, 2, 0);
    // Every face gets (gridU+1)*(gridV+1) vertices; rim strips use 1 across.
    const expected = 10 * 9 + 4 * (2 * 3);
    expect(g.getAttribute("position").count).toBe(expected);
  });
});

describe("ShellBoxGeometry bevels", () => {
  it("defaults to a quarter of the wall with one step, and zero disables it", () => {
    const g = new ShellBoxGeometry(0.6, 0.4, 0.2, 0.04);
    expect(g.parameters.bevelSize).toBeCloseTo(0.01);
    expect(g.parameters.bevelSegments).toBe(1);
    const plain = new ShellBoxGeometry(0.6, 0.4, 0.2, 0.04, 1, 1, 1, 0);
    expect(plain.getAttribute("position").count).toBe(FACES * 4);
    expect(g.getAttribute("position").count).toBeGreaterThan(FACES * 4);
  });

  it("keeps the exterior size and stays finite for any step count", () => {
    for (const steps of [1, 2, 4]) {
      const g = new ShellBoxGeometry(0.6, 0.4, 0.2, 0.05, 1, 1, 1, 0.02, steps);
      g.computeBoundingBox();
      const size = new THREE.Vector3();
      g.boundingBox!.getSize(size);
      expect(size.x).toBeCloseTo(0.6);
      expect(size.y).toBeCloseTo(0.4);
      expect(size.z).toBeCloseTo(0.2);
      const pos = g.getAttribute("position");
      for (let i = 0; i < pos.count; i++) {
        expect(Number.isFinite(pos.getX(i) + pos.getY(i) + pos.getZ(i))).toBe(true);
      }
      const nor = g.getAttribute("normal");
      for (let i = 0; i < nor.count; i++) {
        expect(new THREE.Vector3().fromBufferAttribute(nor, i).length()).toBeCloseTo(1);
      }
    }
  });

  it("winds bevel triangles to face their normals", () => {
    const g = new ShellBoxGeometry(0.6, 0.4, 0.2, 0.05, 1, 1, 1, 0.02, 3);
    const pos = g.getAttribute("position");
    const nor = g.getAttribute("normal");
    const idx = g.getIndex()!;
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    for (let i = 0; i < idx.count; i += 3) {
      a.fromBufferAttribute(pos, idx.getX(i));
      b.fromBufferAttribute(pos, idx.getX(i + 1));
      c.fromBufferAttribute(pos, idx.getX(i + 2));
      const face = b.clone().sub(a).cross(c.clone().sub(a));
      if (face.lengthSq() < 1e-18) continue; // degenerate at fan seams
      const stored = new THREE.Vector3()
        .fromBufferAttribute(nor, idx.getX(i))
        .add(new THREE.Vector3().fromBufferAttribute(nor, idx.getX(i + 1)))
        .add(new THREE.Vector3().fromBufferAttribute(nor, idx.getX(i + 2)));
      expect(face.dot(stored)).toBeGreaterThanOrEqual(0);
    }
  });

  it("clamps the bevel so opposite bevels cannot cross", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    // Half the wall is the limit here.
    expect(new ShellBoxGeometry(1, 1, 1, 0.1, 1, 1, 1, 5).parameters.bevelSize).toBeCloseTo(0.05);
    // A shallow cavity limits it to half the cavity height.
    expect(new ShellBoxGeometry(1, 0.12, 1, 0.1, 1, 1, 1, 5).parameters.bevelSize).toBeCloseTo(0.01);
    warn.mockRestore();
    expect(ShellBoxGeometry.clampBevel(-1, 1, 1, 1, 0.1)).toBe(0);
  });
});
