# runWall

An interactive 3D experience for tracking progress brick by brick. You define a taxonomy of the things you want to track, give each type a colour, and every completed item places a brick in 3D space. The bricks stack into a wall.

The idea is an expression of "The Bricks", a progress-tracking metaphor described by Allie Bailey and also discussed by David Roche on the Everyday Ultra podcast. See [docs/reference/the-bricks-allie-bailey.md](docs/reference/the-bricks-allie-bailey.md).

## Layout

```
runWall/
  apps/runWallApp/   # the Next.js application (pnpm workspace member)
  docs/              # all project documentation, start at docs/00-executive-summary.md
```

## Getting started

```sh
pnpm install
pnpm dev          # http://localhost:3000
```

Requires Node.js 20+ and pnpm 10. See [apps/runWallApp/README.md](apps/runWallApp/README.md) for environment variables and scripts.

## Documentation

Start with [docs/00-executive-summary.md](docs/00-executive-summary.md). Root-level docs are numbered in reading order. Sub-folders are used sparingly:

| Folder | Purpose |
|--------|---------|
| `docs/decisions/` | Dated architecture decision records |
| `docs/planning/` | Intent and design, numbered in reading order |
| `docs/research/` | Unordered investigations and comparisons |
| `docs/reference/` | Source material the project is based on |
