# runWallApp

The runWall web application: an interactive 3D wall for tracking progress brick by brick. Project docs live in [`../../docs`](../../docs/00-executive-summary.md).

## Stack

| Concern | Choice |
|---------|--------|
| Framework | Next.js (App Router), React, TypeScript |
| 3D | three.js, @react-three/fiber, @react-three/drei, maath |
| Styling | Tailwind CSS v4 |
| Client state | zustand (persisted to localStorage for now) |
| Validation | zod |
| Database | PostgreSQL on Neon via Drizzle ORM (`@neondatabase/serverless`) |
| Content | Sanity via `next-sanity` (standalone Studio, see below) |
| Email | Veil Mail via `@resonia/veilmail-sdk` |

## Getting started

```sh
pnpm install            # from the repo root
cp apps/runWallApp/.env.example apps/runWallApp/.env.local
pnpm dev                # http://localhost:3000
```

The 3D scene runs without any environment variables. Database, Sanity and email are only initialised when first used.

## Scripts

| Script | What it does |
|--------|--------------|
| `pnpm dev` | Start the dev server |
| `pnpm build` / `pnpm start` | Production build and serve |
| `pnpm lint` / `pnpm typecheck` | ESLint and `tsc --noEmit` |
| `pnpm db:generate` | Generate SQL migrations from `src/db/schema.ts` |
| `pnpm db:migrate` / `pnpm db:push` | Apply migrations, or push the schema directly (dev only) |
| `pnpm db:studio` | Open Drizzle Studio |

## Layout

```
src/
  app/                 # App Router: layout, page, global styles
  components/wall/     # WallExperience (client wrapper), WallCanvas (r3f scene), Overlay
  store/               # zustand stores
  lib/                 # zod schemas, email client
  db/                  # Drizzle schema and Neon client
  sanity/              # Sanity client, live content, image builder
public/models/         # glTF assets
```

## The 3D scene

`WallCanvas.tsx` is adapted from the pmndrs [caustics example](https://github.com/pmndrs/examples/tree/main/examples/caustics) by Paul Henschel. The glTF model carries CC-BY-4.0 credits, listed in the component. The scene will be reshaped into the brick wall as the project develops.

## Sanity

The Studio is intended to run as a standalone app (`apps/studio`), per Sanity guidance, rather than embedded in Next.js. Once a project exists:

1. Fill in the `NEXT_PUBLIC_SANITY_*` variables and `SANITY_API_READ_TOKEN` in `.env.local`.
2. Render `<SanityLive />` from `src/sanity/lib/live.ts` in `src/app/layout.tsx`.
3. Add `http://localhost:3000` to the CORS origins of the Sanity project.
