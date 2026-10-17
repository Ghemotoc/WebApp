# ADR 0001: Claude Code first, our own Supabase in the EU (Ireland)

- **Date:** 17 October 2026
- **Status:** Accepted (Robert, chat, 11:20)

## Context
The plan said "prototype with Claude Code, then build in Lovable, on Lovable's database first" (Q37). Research H2 (17 Oct 2026) found that new Lovable projects use TanStack Start rather than React and Vite, that Lovable can't import an existing repository, that it doesn't run migrations pushed through Git, and that moving from Lovable Cloud to our own Supabase is manual.

## Decision
Claude Code builds first, in this repository (Ghemotoc/WebApp), with React, Vite and TypeScript. The database is our own Supabase project in West EU (Ireland, eu-west-1) from day one. Migrations reach staging only through Supabase's GitHub integration when main changes (connected by Robert on 17 Oct 2026).

## Consequences
- S1-E1-06 (move from Lovable's database) is Won't. The March MVP is 49 stories, about 552 hours.
- Lovable's role is OPEN, pending a possible two-screen trial.
- Local development uses the Supabase CLI in Docker, in cloud sessions and on the Mac.
