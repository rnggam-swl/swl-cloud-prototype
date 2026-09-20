# Ajena — Sawala Cloud Prototype

This repository is a clickable, functional prototype of **Ajena**, one of the services under
**Sawala Cloud**. Only Ajena is covered here for now — other Sawala Cloud services are out of
scope for this repository.

## What this repository is for

This is not production code, and it isn't meant to become production code by itself. It exists
as a **reference implementation of proposed solutions**, built out of discussions with the AI
Team, so a design/product direction can be interacted with and reasoned about concretely instead
of argued over static mocks or slide decks.

Whether this exact prototype ever ends up reused in production is not the point and not a
concern of this repo. What matters is **validating the proposed solution** — letting the actual
interaction flow, edge cases, and state changes be experienced for real during a testing session,
so the design decision it represents is grounded in something real before real engineering time
is committed to it.

Because of that:
- The app runs entirely client-side. There is **no real backend** — all data (agents, knowledge
  base documents, workflows, settings) is seeded on first load and persisted to the browser's
  `localStorage`. Nothing here talks to a server.
- Where a feature has more than one plausible design direction, this prototype may ship several
  of them switchable side by side (see [`docs/`](docs)) specifically so they can be compared live
  with stakeholders, rather than committing to one direction up front.
- Decisions reached this way are written up under [`docs/`](docs) as the durable record of *why*,
  since the prototype code itself will keep changing.

## What's inside

- **Knowledge base** — document management with switchable access-control approaches (see
  [`docs/knowledge-access-variants.md`](docs/knowledge-access-variants.md)).
- **Workflows** — a visual flow/diagram builder for automations.
- **Settings** — agent roster, instructions, model configuration, Connect (WhatsApp) channel and
  widget settings, usage.

## Docs

- [Knowledge base access control: variant comparison and decision](docs/knowledge-access-variants.md) — why Variant C (Knowledge Groups) was chosen over multi-select agents and access routing, and what a real backend for each variant would look like.
- [PF-1 — Knowledge base feedback (AI Team review)](docs/pf-1-knowledge-base-feedback.md) — spec for a future execution pass covering created/updated metadata + in-place editing, distinct upload error states, and the Sort → Filter change.
- [Ticket — Knowledge scope selector](docs/ticket-knowledge-scope-selector.md) — proposed solution for the "Add a document" scope dropdown and the Agent form's Knowledge Groups field, covering both since they're two views of the same access model.

## Running locally

```bash
npm install
npm run dev
```

Other scripts: `npm run build` (typecheck + production build), `npm run lint` (Oxlint), `npm run preview`.

## Stack

Vite + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui, `react-router-dom` (HashRouter),
`@xyflow/react` + `@dagrejs/dagre` for the workflow diagram builder.
