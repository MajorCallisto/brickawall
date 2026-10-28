import * as THREE from "three";
import type { BufferGeometry, BufferGeometryJSON } from "three";

type Axis = "x" | "y" | "z";

const AXIS_VECTOR: Record<Axis, THREE.Vector3> = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

/** Material group indices, matching BoxGeometry: +x, -x, +y, -y, +z, -z. */
const GROUP = { px: 0, nx: 1, py: 2, ny: 3, pz: 4, nz: 5 } as const;

type PlaneSpec = {
  /** Axis that runs across the face (maps to u). */
  u: Axis;
  /** Axis that runs up the face (maps to v). */
  v: Axis;
  /** Axis the face is perpendicular to (its normal). */
  w: Axis;
  /** Centre of the face in u/v coordinates. */
  uCenter: number;
  vCenter: number;
  /** Size of the face along u and v. */
  uSize: number;
  vSize: number;
  /** Position of the face along w. */
  wPos: number;
  /** Direction of the normal along w: 1 or -1. */
  normalSign: 1 | -1;
  /** Subdivisions along u and v. */
  gridU: number;
  gridV: number;
  materialIndex: number;
};

type V3 = THREE.Vector3;
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Maps canonical (+x, +z) corner geometry onto the other three corners. */
type Xform = (v: V3) => V3;

/**
 * A box with a box cut out of it, open at the bottom: five walls of equal
 * thickness and no floor. Every face is built by hand with flat normals.
 *
 * Takes the same parameters as BoxGeometry, plus `wallThickness`, which is
 * clamped to keep the shell valid: above zero, at most half the smaller of
 * width and depth, and at most the height. At the maximum the cavity closes
 * and the result is a solid box.
 *
 * `bevelSize` and `bevelSegments` bevel every edge: the outer edges, the
 * cavity edges (as fillets) and the edges of the bottom rim. One segment is
 * a chamfer; more approximate a fillet. The bevel never grows the exterior
 * and is clamped so opposite bevels cannot cross. Zero disables it.
 *
 * Material groups follow BoxGeometry (+x, -x, +y, -y, +z, -z). Inner walls
 * share the group of the outer wall they sit behind; the four bottom rim
 * strips face down and belong to the -y group. Bevels take the group of
 * the first face they join.
 */
export class ShellBoxGeometry extends THREE.BufferGeometry {
  static readonly MIN_WALL_THICKNESS = 1e-5;

  override readonly type: string = "ShellBoxGeometry";

  parameters: {
    width: number;
    height: number;
    depth: number;
    wallThickness: number;
    widthSegments: number;
    heightSegments: number;
    depthSegments: number;
    bevelSize: number;
    bevelSegments: number;
  };

  private indices: number[] = [];
  private vertices: number[] = [];
  private normals: number[] = [];
  private uvs: number[] = [];
  private vertexCount = 0;

  constructor(
    width = 1,
    height = 1,
    depth = 1,
    wallThickness = 0.1,
    widthSegments = 1,
    heightSegments = 1,
    depthSegments = 1,
    bevelSize = wallThickness / 4,
    bevelSegments = 1,
  ) {
    super();

    const t = ShellBoxGeometry.clampWallThickness(
      wallThickness,
      width,
      height,
      depth,
    );
    const ws = Math.max(1, Math.floor(widthSegments));
    const hs = Math.max(1, Math.floor(heightSegments));
    const ds = Math.max(1, Math.floor(depthSegments));
    const b = ShellBoxGeometry.clampBevel(bevelSize, width, height, depth, t);
    const n = Math.max(1, Math.floor(bevelSegments));

    this.parameters = {
      width,
      height,
      depth,
      wallThickness: t,
      widthSegments: ws,
      heightSegments: hs,
      depthSegments: ds,
      bevelSize: b,
      bevelSegments: n,
    };

    const hw = width / 2;
    const hh = height / 2;
    const hd = depth / 2;
    // Cavity extents: inset by the wall on x and z, its ceiling one wall down.
    const cw = hw - t;
    const cd = hd - t;
    const ch = hh - t;
    const innerW = 2 * cw;
    const innerD = 2 * cd;
    const cavityH = height - t;
    const cavityY = -t / 2;

    // Faces, each inset by the bevel along every edge it shares with a bevel.
    const faces: PlaneSpec[] = [
      // Outer faces
      { u: "x", v: "z", w: "y", uCenter: 0, vCenter: 0, uSize: width - 2 * b, vSize: depth - 2 * b, wPos: hh, normalSign: 1, gridU: ws, gridV: ds, materialIndex: GROUP.py },
      { u: "z", v: "y", w: "x", uCenter: 0, vCenter: 0, uSize: depth - 2 * b, vSize: height - 2 * b, wPos: hw, normalSign: 1, gridU: ds, gridV: hs, materialIndex: GROUP.px },
      { u: "z", v: "y", w: "x", uCenter: 0, vCenter: 0, uSize: depth - 2 * b, vSize: height - 2 * b, wPos: -hw, normalSign: -1, gridU: ds, gridV: hs, materialIndex: GROUP.nx },
      { u: "x", v: "y", w: "z", uCenter: 0, vCenter: 0, uSize: width - 2 * b, vSize: height - 2 * b, wPos: hd, normalSign: 1, gridU: ws, gridV: hs, materialIndex: GROUP.pz },
      { u: "x", v: "y", w: "z", uCenter: 0, vCenter: 0, uSize: width - 2 * b, vSize: height - 2 * b, wPos: -hd, normalSign: -1, gridU: ws, gridV: hs, materialIndex: GROUP.nz },

      // Inner faces, normals pointing into the cavity
      { u: "x", v: "z", w: "y", uCenter: 0, vCenter: 0, uSize: innerW - 2 * b, vSize: innerD - 2 * b, wPos: ch, normalSign: -1, gridU: ws, gridV: ds, materialIndex: GROUP.py },
      { u: "z", v: "y", w: "x", uCenter: 0, vCenter: cavityY, uSize: innerD - 2 * b, vSize: cavityH - 2 * b, wPos: cw, normalSign: -1, gridU: ds, gridV: hs, materialIndex: GROUP.px },
      { u: "z", v: "y", w: "x", uCenter: 0, vCenter: cavityY, uSize: innerD - 2 * b, vSize: cavityH - 2 * b, wPos: -cw, normalSign: 1, gridU: ds, gridV: hs, materialIndex: GROUP.nx },
      { u: "x", v: "y", w: "z", uCenter: 0, vCenter: cavityY, uSize: innerW - 2 * b, vSize: cavityH - 2 * b, wPos: cd, normalSign: -1, gridU: ws, gridV: hs, materialIndex: GROUP.pz },
      { u: "x", v: "y", w: "z", uCenter: 0, vCenter: cavityY, uSize: innerW - 2 * b, vSize: cavityH - 2 * b, wPos: -cd, normalSign: 1, gridU: ws, gridV: hs, materialIndex: GROUP.nz },

      // Bottom rim strips, facing down, between the outer outline inset by
      // the bevel and the cavity outline grown by it. The x strips run the
      // full depth; the z strips fill the gap between them.
      { u: "x", v: "z", w: "y", uCenter: (hw + cw) / 2, vCenter: 0, uSize: t - 2 * b, vSize: depth - 2 * b, wPos: -hh, normalSign: -1, gridU: 1, gridV: ds, materialIndex: GROUP.ny },
      { u: "x", v: "z", w: "y", uCenter: -(hw + cw) / 2, vCenter: 0, uSize: t - 2 * b, vSize: depth - 2 * b, wPos: -hh, normalSign: -1, gridU: 1, gridV: ds, materialIndex: GROUP.ny },
      { u: "x", v: "z", w: "y", uCenter: 0, vCenter: (hd + cd) / 2, uSize: innerW + 2 * b, vSize: t - 2 * b, wPos: -hh, normalSign: -1, gridU: ws, gridV: 1, materialIndex: GROUP.ny },
      { u: "x", v: "z", w: "y", uCenter: 0, vCenter: -(hd + cd) / 2, uSize: innerW + 2 * b, vSize: t - 2 * b, wPos: -hh, normalSign: -1, gridU: ws, gridV: 1, materialIndex: GROUP.ny },
    ];

    for (const face of faces) this.addPlane(face);

    if (b > 0) this.addBevels({ hw, hh, hd, cw, ch, cd, b, n });

    this.setIndex(this.indices);
    this.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(this.vertices, 3),
    );
    this.setAttribute("normal", new THREE.Float32BufferAttribute(this.normals, 3));
    this.setAttribute("uv", new THREE.Float32BufferAttribute(this.uvs, 2));

    // Scratch arrays are no longer needed once the attributes are set.
    this.indices = [];
    this.vertices = [];
    this.normals = [];
    this.uvs = [];
  }

  /** Clamp a wall thickness into the valid range for the given box size. */
  static clampWallThickness(
    wallThickness: number,
    width: number,
    height: number,
    depth: number,
  ): number {
    const min = ShellBoxGeometry.MIN_WALL_THICKNESS;
    const max = Math.max(min, Math.min(width / 2, depth / 2, height));
    if (wallThickness < min || wallThickness > max) {
      console.warn(
        `ShellBoxGeometry: wallThickness ${wallThickness} clamped to [${min}, ${max}].`,
      );
    }
    return Math.min(max, Math.max(min, wallThickness));
  }

  /**
   * Clamp a bevel so that opposite bevels never cross: at most half the wall,
   * half the cavity in any direction, and half the height.
   */
  static clampBevel(
    bevelSize: number,
    width: number,
    height: number,
    depth: number,
    wallThickness: number,
  ): number {
    const t = wallThickness;
    const max = Math.min(
      t / 2,
      (width - 2 * t) / 2,
      (depth - 2 * t) / 2,
      (height - t) / 2,
      height / 2,
    );
    if (!(max > 0) || !(bevelSize > 0)) return 0;
    if (bevelSize > max) {
      console.warn(`ShellBoxGeometry: bevelSize ${bevelSize} clamped to ${max}.`);
    }
    return Math.min(max, bevelSize);
  }

  private addPlane(spec: PlaneSpec) {
    const { u, v, w, uCenter, vCenter, uSize, vSize, wPos, normalSign } = spec;
    const { gridU, gridV, materialIndex } = spec;
    const segU = uSize / gridU;
    const segV = vSize / gridV;
    const startIndex = this.indices.length;
    const base = this.vertexCount;

    const p = new THREE.Vector3();
    const nrm = new THREE.Vector3();
    nrm[w] = normalSign;

    for (let iv = 0; iv <= gridV; iv++) {
      const vPos = vCenter + vSize / 2 - iv * segV;
      for (let iu = 0; iu <= gridU; iu++) {
        const uPos = uCenter - uSize / 2 + iu * segU;
        p.set(0, 0, 0);
        p[u] = uPos;
        p[v] = vPos;
        p[w] = wPos;
        this.vertices.push(p.x, p.y, p.z);
        this.normals.push(nrm.x, nrm.y, nrm.z);
        this.uvs.push(iu / gridU, 1 - iv / gridV);
        this.vertexCount++;
      }
    }

    // Vertices are laid out with u to the right and v upward, so the winding
    // (a, b, d), (b, c, d) faces along u cross v. Flip it when that points
    // against the requested normal.
    const facing = AXIS_VECTOR[u].clone().cross(AXIS_VECTOR[v]).dot(nrm) > 0;
    const stride = gridU + 1;
    for (let iv = 0; iv < gridV; iv++) {
      for (let iu = 0; iu < gridU; iu++) {
        const a = base + iu + stride * iv;
        const bb = base + iu + stride * (iv + 1);
        const c = base + (iu + 1) + stride * (iv + 1);
        const d = base + (iu + 1) + stride * iv;
        if (facing) this.indices.push(a, bb, d, bb, c, d);
        else this.indices.push(a, d, bb, bb, d, c);
      }
    }

    this.addGroup(startIndex, this.indices.length - startIndex, materialIndex);
  }

  /** Push one triangle with per-vertex normals, wound to face its normals. */
  private pushTri(p0: V3, p1: V3, p2: V3, n0: V3, n1: V3, n2: V3) {
    const facing = v3(0, 0, 0)
      .subVectors(p1, p0)
      .cross(v3(0, 0, 0).subVectors(p2, p0))
      .dot(v3(0, 0, 0).add(n0).add(n1).add(n2));
    const order = facing >= 0 ? [p0, p1, p2] : [p0, p2, p1];
    const norms = facing >= 0 ? [n0, n1, n2] : [n0, n2, n1];
    for (let i = 0; i < 3; i++) {
      const p = order[i];
      const nn = norms[i];
      this.vertices.push(p.x, p.y, p.z);
      this.normals.push(nn.x, nn.y, nn.z);
      this.uvs.push(0, 0);
      this.indices.push(this.vertexCount++);
    }
  }

  /**
   * Points along a bevel arc between two faces meeting at corner point `c`
   * with material-outward normals `na` and `nb`. Convex edges bulge out of
   * the material; concave ones (fillets) curve into the air. Returns
   * `n + 1` points from face A to face B, with their normals.
   */
  private static arc(
    c: V3,
    na: V3,
    nb: V3,
    b: number,
    n: number,
    convex: boolean,
  ): { p: V3; n: V3 }[] {
    const sum = v3(0, 0, 0).add(na).add(nb);
    const center = convex
      ? v3(0, 0, 0).copy(c).addScaledVector(sum, -b)
      : v3(0, 0, 0).copy(c).addScaledVector(sum, b);
    const out: { p: V3; n: V3 }[] = [];
    for (let i = 0; i <= n; i++) {
      const th = (Math.PI / 2) * (i / n);
      const dir = v3(0, 0, 0)
        .addScaledVector(na, Math.cos(th))
        .addScaledVector(nb, Math.sin(th));
      const p = v3(0, 0, 0)
        .copy(center)
        .addScaledVector(dir, convex ? b : -b);
      out.push({ p, n: dir.normalize() });
    }
    return out;
  }

  /** Strip of quads along an edge from corner `c0` to `c1`. */
  private addStrip(
    c0: V3,
    c1: V3,
    na: V3,
    nb: V3,
    b: number,
    n: number,
    convex: boolean,
    xf: Xform,
    materialIndex: number,
  ) {
    const start = this.indices.length;
    const a0 = ShellBoxGeometry.arc(c0, na, nb, b, n, convex);
    const a1 = ShellBoxGeometry.arc(c1, na, nb, b, n, convex);
    for (let i = 0; i < n; i++) {
      const p00 = xf(a0[i].p);
      const p01 = xf(a0[i + 1].p);
      const p10 = xf(a1[i].p);
      const p11 = xf(a1[i + 1].p);
      const n00 = xf(a0[i].n);
      const n01 = xf(a0[i + 1].n);
      const n10 = xf(a1[i].n);
      const n11 = xf(a1[i + 1].n);
      this.pushTri(p00, p10, p11, n00, n10, n11);
      this.pushTri(p00, p11, p01, n00, n11, n01);
    }
    this.addGroup(start, this.indices.length - start, materialIndex);
  }

  /**
   * Spherical patch where three faces meet at `c`, all convex or all
   * concave. Subdivided by barycentric interpolation of the three normals.
   */
  private addCorner(
    c: V3,
    na: V3,
    nb: V3,
    nc: V3,
    b: number,
    n: number,
    convex: boolean,
    xf: Xform,
    materialIndex: number,
  ) {
    const start = this.indices.length;
    const sum = v3(0, 0, 0).add(na).add(nb).add(nc);
    const center = v3(0, 0, 0).copy(c).addScaledVector(sum, convex ? -b : b);
    const at = (i: number, j: number) => {
      const wa = (n - i - j) / n;
      const wb = i / n;
      const wc = j / n;
      const dir = v3(0, 0, 0)
        .addScaledVector(na, wa)
        .addScaledVector(nb, wb)
        .addScaledVector(nc, wc)
        .normalize();
      const p = v3(0, 0, 0).copy(center).addScaledVector(dir, convex ? b : -b);
      return { p: xf(p), n: xf(dir) };
    };
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n - i; j++) {
        const q0 = at(i, j);
        const q1 = at(i + 1, j);
        const q2 = at(i, j + 1);
        this.pushTri(q0.p, q1.p, q2.p, q0.n, q1.n, q2.n);
        if (i + j < n - 1) {
          const q3 = at(i + 1, j + 1);
          this.pushTri(q1.p, q3.p, q2.p, q1.n, q3.n, q2.n);
        }
      }
    }
    this.addGroup(start, this.indices.length - start, materialIndex);
  }

  /**
   * Fan over a ring of boundary points with flat per-triangle normals,
   * oriented along `ref`. Used where convex and concave edges meet.
   */
  private addFan(apex: V3, ring: V3[], ref: V3, xf: Xform, materialIndex: number) {
    const start = this.indices.length;
    const a = xf(apex);
    const r = xf(ref);
    for (let i = 0; i + 1 < ring.length; i++) {
      const p1 = xf(ring[i]);
      const p2 = xf(ring[i + 1]);
      const nrm = v3(0, 0, 0)
        .subVectors(p1, a)
        .cross(v3(0, 0, 0).subVectors(p2, a));
      if (nrm.lengthSq() === 0) continue;
      nrm.normalize();
      if (nrm.dot(r) < 0) nrm.negate();
      this.pushTri(a, p1, p2, nrm, nrm, nrm);
    }
    this.addGroup(start, this.indices.length - start, materialIndex);
  }

  /** All twenty-four edge bevels and their corners. */
  private addBevels(d: {
    hw: number;
    hh: number;
    hd: number;
    cw: number;
    ch: number;
    cd: number;
    b: number;
    n: number;
  }) {
    const { hw, hh, hd, cw, ch, cd, b, n } = d;
    const PX = v3(1, 0, 0);
    const NX = v3(-1, 0, 0);
    const PY = v3(0, 1, 0);
    const NY = v3(0, -1, 0);
    const PZ = v3(0, 0, 1);
    const NZ = v3(0, 0, -1);

    // Edges parallel to z on the +x side, then mirrored/swapped to the other
    // three sides. `swap` exchanges x and z, so the +z side reuses the +x
    // recipe with depth and width exchanged.
    const sides: { xf: Xform; group: number; groupIn: number; hw: number; hd: number; cw: number; cd: number }[] = [
      { xf: (v) => v3(v.x, v.y, v.z), group: GROUP.px, groupIn: GROUP.px, hw, hd, cw, cd },
      { xf: (v) => v3(-v.x, v.y, v.z), group: GROUP.nx, groupIn: GROUP.nx, hw, hd, cw, cd },
      { xf: (v) => v3(v.z, v.y, v.x), group: GROUP.pz, groupIn: GROUP.pz, hw: hd, hd: hw, cw: cd, cd: cw },
      { xf: (v) => v3(v.z, v.y, -v.x), group: GROUP.nz, groupIn: GROUP.nz, hw: hd, hd: hw, cw: cd, cd: cw },
    ];

    for (const s of sides) {
      const { xf } = s;
      const W = s.hw;
      const D = s.hd;
      const CW = s.cw;
      const CD = s.cd;
      // Outer top edge (+x face meets top): convex.
      this.addStrip(v3(W, hh, -D + b), v3(W, hh, D - b), PX, PY, b, n, true, xf, s.group);
      // Outer bottom edge (+x face meets rim): convex.
      this.addStrip(v3(W, -hh, -D + b), v3(W, -hh, D - b), PX, NY, b, n, true, xf, s.group);
      // Cavity ceiling edge (+x wall meets ceiling): concave fillet.
      this.addStrip(v3(CW, ch, -CD + b), v3(CW, ch, CD - b), NX, NY, b, n, false, xf, s.groupIn);
      // Cavity bottom edge (+x wall meets rim): convex.
      this.addStrip(v3(CW, -hh, -CD + b), v3(CW, -hh, CD - b), NX, NY, b, n, true, xf, s.groupIn);
    }

    // Vertical edges and corners at the (+x, +z) corner, mirrored to all four.
    const corners: Xform[] = [
      (v) => v3(v.x, v.y, v.z),
      (v) => v3(-v.x, v.y, v.z),
      (v) => v3(v.x, v.y, -v.z),
      (v) => v3(-v.x, v.y, -v.z),
    ];
    for (const xf of corners) {
      // Outer vertical edge: convex.
      this.addStrip(v3(hw, -hh + b, hd), v3(hw, hh - b, hd), PX, PZ, b, n, true, xf, GROUP.px);
      // Cavity vertical edge: concave fillet.
      this.addStrip(v3(cw, -hh + b, cd), v3(cw, ch - b, cd), NX, NZ, b, n, false, xf, GROUP.px);
      // Outer top corner (two sides and the top): convex.
      this.addCorner(v3(hw, hh, hd), PX, PY, PZ, b, n, true, xf, GROUP.px);
      // Outer bottom corner (two sides and the rim): convex.
      this.addCorner(v3(hw, -hh, hd), PX, NY, PZ, b, n, true, xf, GROUP.px);
      // Cavity top corner (two walls and the ceiling): concave.
      this.addCorner(v3(cw, ch, cd), NX, NY, NZ, b, n, false, xf, GROUP.px);

      // Cavity bottom corner: the two wall/rim chamfers (convex) meet the
      // vertical fillet (concave). Fan from the rim's inner corner over the
      // three profiles that bound it.
      const rimCorner = v3(cw + b, -hh, cd + b);
      const xProfile = ShellBoxGeometry.arc(v3(cw, -hh, cd - b), NX, NY, b, n, true)
        .map((q) => q.p)
        .reverse(); // rim -> wall
      const vProfile = ShellBoxGeometry.arc(v3(cw, -hh + b, cd), NX, NZ, b, n, false).map(
        (q) => q.p,
      ); // +x wall -> +z wall
      const zProfile = ShellBoxGeometry.arc(v3(cw - b, -hh, cd), NZ, NY, b, n, true).map(
        (q) => q.p,
      ); // wall -> rim
      const ring = [...xProfile, ...vProfile.slice(1), ...zProfile.slice(1)];
      this.addFan(rimCorner, ring, v3(-1, -1, -1), xf, GROUP.ny);
    }
  }

  override copy(source: BufferGeometry): this {
    super.copy(source);
    if (source instanceof ShellBoxGeometry) {
      this.parameters = { ...source.parameters };
    }
    return this;
  }

  override toJSON(): BufferGeometryJSON & ShellBoxGeometry["parameters"] {
    return { ...super.toJSON(), ...this.parameters };
  }

  static fromJSON(data: ShellBoxGeometry["parameters"]) {
    return new ShellBoxGeometry(
      data.width,
      data.height,
      data.depth,
      data.wallThickness,
      data.widthSegments,
      data.heightSegments,
      data.depthSegments,
      data.bevelSize,
      data.bevelSegments,
    );
  }
}
