# PROMPTS.md — Lumo build prompts for Claude Code

How to use this file:

1. Put `CLAUDE.md` at the repo root and the three docs in `/docs`.
2. Open Claude Code in the repo root.
3. Paste **Prompt A** below to start Phase 0.
4. When a phase is done and verified, paste **Prompt B** (the template) to advance.
5. If a response gets cut off, paste **Prompt C** to resume cleanly.

---

## Prompt A — Kickoff (paste this first)

```
You are the lead engineer on Lumo, a Nigerian classified ads marketplace.

First, read CLAUDE.md and the three files in /docs (PRD.md, TRD.md, APP_FLOW.md).
These are the source of truth. Don't re-derive decisions already made there; if
something is ambiguous or conflicts, ask me before coding.

Working rules (follow strictly — I've hit output-token limits on big one-shot builds):
- Build ONE phase at a time. We are starting Phase 0 only.
- Work in small, verifiable units. After each unit, summarise what changed.
- Make targeted file edits; do not print or rewrite the whole codebase.
- End every phase in a runnable state, then STOP and wait for me to say
  "proceed to Phase 1." Do not continue past Phase 0 on your own.
- Ask before adding any dependency or deviating from the stack in CLAUDE.md.

Phase 0 deliverables (Foundations):
1. pnpm-workspaces monorepo: apps/web (Next.js + TS + Tailwind + shadcn/ui),
   apps/api (Express + TS), packages/shared (Zod schemas, types, enums).
2. Tooling: tsconfig, eslint, prettier, .env.example with the vars from TRD §26,
   and root scripts (dev, lint, typecheck).
3. Prisma: schema.prisma with the entities and enums from TRD §9–10, plus the
   first migration and generated client. Use integer kobo for money.
4. Express API skeleton at /api/v1 with: config loader, error envelope, request
   logging (pino), CORS allow-list, helmet, and a GET /health route.
5. Auth + RBAC: register, login, refresh (rotating, httpOnly cookie, reuse
   detection), logout, GET /me. Argon2 password hashing. Roles enum + RolesGuard
   middleware + ownership-check helper.
6. Next.js skeleton: layout, Tailwind/shadcn setup, an api-client lib, and stub
   pages for /, /login, /register, /dashboard (no real features yet).

Start by proposing a short ordered checklist for Phase 0, then begin with item 1.
After each item, pause briefly so I can confirm before you continue. When all of
Phase 0 is done, give me exact run/verify steps and STOP.
```

---

## Prompt B — Advance to the next phase (reusable template)

Replace `N` and paste the phase's deliverables from CLAUDE.md / the PRD.

```
Phase {N-1} is done and verified. Update the "Current state" line in CLAUDE.md.

Now do Phase {N} only — {phase name}. Same working rules as before:
one phase at a time, small verifiable units, targeted edits, ask on ambiguity,
end in a runnable state, then STOP and wait for my go-ahead.

Phase {N} deliverables:
- {paste the bullet list for this phase from CLAUDE.md roadmap / PRD}

Before coding: re-read the relevant sections of /docs for this phase, then propose
a short ordered checklist. Execute items sequentially, pausing after each. Respect
every domain rule in CLAUDE.md (PENDING-on-create, webhook-fulfilled payments,
search holds only approved listings, login-gated actions, audit logging).
```

---

## Prompt C — Resume after a cut-off (token limit / interrupted)

```
Your last response was cut off mid-task. Don't repeat work already on disk.
First, briefly list what currently exists for the item you were on (check the
files), then continue from exactly where you stopped. Keep edits targeted and
summarise at the end. Do not start a new phase.
```

---

## Tips to avoid output-token limits

- Drive phase by phase; never ask for "the whole app."
- Within a phase, ask for one module/feature at a time if it's large
  (e.g., "do the auth routes," then "now the RBAC middleware").
- Tell it to make targeted edits, not reprint full files.
- Keep CLAUDE.md lean — it loads every turn and eats your context budget.
- After big changes, ask for a 5-line summary instead of a full diff dump.
- Commit frequently (`feat:`/`fix:`); a clean git state makes resuming easy.

```

```
