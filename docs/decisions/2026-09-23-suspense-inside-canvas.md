# Decision - Suspense boundary inside the react-three-fiber Canvas

**Status:** Accepted 2026-09-23
**Authors:** runWall team
**Supersedes:** None
**Implemented in:** `apps/runWallApp/src/components/wall/WallCanvas.tsx`

## Context

The caustics example this app is adapted from places asset-loading components (`useGLTF`, `Environment`) directly under `<Canvas>` with no Suspense boundary of its own. It relies on the Canvas's built-in behaviour: when the 3D tree suspends, fiber hands the suspension to the outer React tree.

Under the Next.js 16 App Router that handoff never resolves. Assets download successfully, no errors are logged, but the scene stays blank and the frame loop stops after a few frames. Pinning React to 19.2.8 and fiber to 9.7.0 (the example's tested versions) made no difference.

The most likely explanation is the React build the App Router runs on. Next.js bundles its own copy of React (19.3.0-canary-cbb046ab-20260731 in Next 16.3.6) and uses it for all App Router pages regardless of the React version declared in `package.json`, which is 19.3.0 stable here. This is Next's documented behaviour and cannot be configured. The attribution to that build is inferred from elimination, not proven by tracing fiber's suspension code, and the scene was not re-tested under Vite or the Pages Router.

## Options

| Approach | How | Pros | Cons |
|----------|-----|------|------|
| **A. Suspense inside the Canvas** | Wrap the scene in `<Suspense fallback={null}>` under `<Canvas>` | One-line fix; keeps the suspension inside the fiber reconciler; recommended by fiber docs anyway | Loading state must be handled inside the 3D tree |
| B. Pages Router | Move the app to the Pages Router, which uses the React declared in `package.json` | Runs on the installed stable React | Gives up server components and the `next-sanity` live content pattern; not verified to fix the issue |
| C. Preload assets outside React | Load glTF and HDR imperatively, then mount the scene | Avoids Suspense entirely | Reinvents what drei already provides; more code to maintain |

## Decision

Option A, confirmed 2026-09-23 after reviewing the alternatives. Every asset-loading component in a fiber scene must sit inside a Suspense boundary that is itself inside the Canvas. This is a project rule, not just a fix for the caustics scene.

## Verification

Headless Chrome on the hardware GPU: a plain box rendered in every configuration, while glTF and environment loads stalled at two to six frames without the inner boundary and ran continuously with it.
