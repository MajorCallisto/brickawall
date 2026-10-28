# 00 - Executive Summary

## Vision

runWall is an interactive 3D experience for tracking progress. You define a taxonomy of the items you want to track, such as easy runs, sessions, long runs, cross-training, strength work and rest days. Each item type is assigned a colour. Every time you complete an item, a brick of that colour is placed in 3D space, and the bricks stack to form a wall.

The wall is the point. It is a visual record that nothing is wasted and everything counts. Gaps in the wall show where a type of work is missing. Time away from training leaves the wall standing, ready to be built on again. The concept is an expression of "The Bricks" as described by Allie Bailey, a metaphor also discussed by David Roche on the Everyday Ultra podcast. Its originator is unclear (see [reference/the-bricks-allie-bailey.md](./reference/the-bricks-allie-bailey.md)).

## Goals

- Let a user define their own taxonomy of tracked items, each with a colour.
- Place a brick for each completed item and render the growing wall in interactive 3D.
- Make the wall legible at a glance: variety of colour is healthy, long runs of one colour are a signal to look closer.
- Keep the wall persistent so progress is never lost.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Repository layout** | Monorepo with an `apps/` folder | Expected to be one application, but the layout leaves room for shared packages without restructuring later |
| **Documentation** | Numbered root-level docs under `docs/`, sub-folders used sparingly | Reading order is explicit; the executive summary is always the entry point |
| **Web framework** | Next.js (App Router) with React and TypeScript | Full-stack in one app; server components for data, client components for the 3D scene |
| **3D rendering** | three.js via @react-three/fiber and @react-three/drei | Declarative scenes in React; drei provides caustics, environments and soft shadows out of the box |
| **Starting point** | Adapted pmndrs caustics example | Proven lighting and material setup to reshape into the wall, rather than starting from an empty scene |
| **Styling** | Tailwind CSS v4 | Utility-first styling for the HTML overlay and UI |
| **Client state** | zustand, persisted to localStorage | Local-first wall that survives reloads before any server sync exists |
| **Validation** | zod | One set of schemas shared by store, server actions and API routes |
| **Database** | PostgreSQL on Neon via Drizzle ORM | Serverless Postgres with a typed schema that mirrors the zod models |
| **Content** | Sanity with a standalone Studio | Editorial content separate from user data; standalone Studio per Sanity guidance |
| **Email** | Veil Mail | Transactional email with a Resend-style SDK |
| **Suspense placement** | Inside the fiber Canvas | Required under the Next.js App Router; see [decisions/2026-09-23-suspense-inside-canvas.md](./decisions/2026-09-23-suspense-inside-canvas.md) |

## Documents

| Doc | Description |
|-----|-------------|
| [00-executive-summary.md](./00-executive-summary.md) | This document |
| [01-system-architecture.md](./01-system-architecture.md) | Components, data flow and technology choices |
| [decisions/](./decisions/README.md) | Dated architecture decision records |
| [planning/](./planning/README.md) | Intent and design documents |
| [research/](./research/README.md) | Investigations and comparisons |
| [reference/](./reference/README.md) | Source material the project is based on |
