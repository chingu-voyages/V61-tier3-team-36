# Idea → Spec Platform — Design Spec

**Date:** 2026-06-12
**Status:** Approved design, ready for implementation planning
**Working name:** specforge

## Context

This is the **first sub-project** of a larger long-term vision: an end-to-end,
AI-supported software development system that takes a developer from idea all the
way through to build and deployment. That full vision spans at least five largely
independent subsystems (discovery, planning, story building, work breakdown/issue
creation, implementation + deployment). Building all of it in one spec would be
unbuildable, so the vision is decomposed into sub-projects, each with its own
spec → plan → build cycle.

**This document covers only the wedge: idea → spec/PRD.**

## Product summary

A commercial web app for a **solo developer / indie hacker** who has already
committed to an idea. An AI conducts a one-question-at-a-time interview that
discovers the idea's features and scope, then produces a structured, implementation-ready
spec/PRD. The developer can keep multiple projects, each with its own spec, and
return to or share them via a lightweight magic link.

### In scope

- Feature/scope discovery for an idea the developer has already committed to.
- A conversational, AI-led interview that converges on a complete spec.
- A structured spec/PRD as the output artifact (Markdown + machine-readable form).
- Multiple projects per workspace.
- Lightweight, password-less persistence (magic link = workspace).
- Bring-your-own ai model API key.

### Explicitly out of scope (deferred to later sub-projects)

- **Market validation / "should I build this?"** — only feature discovery within a
  committed idea is in scope.
- **Implementation plan** — phased build steps are a separate sub-project.
- **Work breakdown / issue creation** — a separate sub-project.
- **Code implementation** — a separate sub-project (see "Deferred seams").
- **Repo integration (GitHub/GitLab)** — a future integration (see "Deferred seams").
- **Full accounts / passwords** — magic-link workspace identity only.

## Beachhead user

**Solo developer / indie hacker** — idea-haver, planner, and implementer in one
person. Values speed and low ceremony; wants the AI to do the heavy lifting of
turning a fuzzy idea into something structured enough to build from. No handoffs
to coordinate.

## Key decisions

| Decision | Choice |
|---|---|
| Context | Commercial product / startup |
| Beachhead user | Solo dev / indie hacker |
| Wedge stage | Idea → spec/PRD |
| Funnel start | Feature discovery only (no market validation) |
| Output artifact | Spec/PRD only |
| Interaction model | Conversational, AI-led interview |
| Form factor | Web app |
| Identity / persistence | Magic-link = workspace; many projects per workspace |
| AI backend | Bring-your-own ai model key |
| Architecture | Full-stack Next.js + serverless |
| Interview engine | Schema-anchored adaptive interview |

## The target spec schema

The structure the interview fills and the artifact the developer walks away with.
The interview will not generate the final spec until it has enough to fill every
section. This structured form is also the **implementation-ready handoff artifact**
for downstream sub-projects.

1. **Problem & goal** — what the idea is, the problem it solves, who it's for.
2. **Core features** — prioritized list, each with a one-line description and a
   must-have / nice-to-have tag.
3. **Scope & non-goals** — what's in and, explicitly, what's deliberately out (YAGNI guardrail).
4. **User flows** — key paths through the product, in plain language.
5. **Constraints & assumptions** — tech preferences, platform, timeline, known limits.
6. **Success criteria** — how the developer knows it works / is done.
7. **Open questions** — deliberately deferred items, captured rather than lost.

Output is rendered as clean Markdown (the natural handoff format for downstream
coding tools), with a parallel machine-readable structured form.

## Architecture & data model

**Stack:** Next.js (App Router), full-stack. React frontend, API routes for the
backend, server-side calls to ai model using the user's key, hosted Postgres for
persistence.

**Components:**

- **Chat UI** — the interview surface (message list, input, streaming responses).
- **Project dashboard** — the workspace's list of projects; create / open / rename / delete.
- **Spec view** — renders the generated Markdown spec; export / copy / download.
- **API layer** — `/api/chat` (proxies to ai model, streams), `/api/projects` (CRUD),
  `/api/spec` (generate / fetch).
- **ai client** — server-side wrapper. The user's key is sent per-request in
  headers and **never stored server-side** (held client-side).

**Data model:**

```
workspace (id, magic_token, created_at)
  └── project (id, workspace_id, name, status, created_at)
        ├── conversation (id, project_id, messages[], interview_state)
        └── spec (id, project_id, markdown, schema_json, version, created_at)
```

- `magic_token` is the credential — possessing the link grants access to that workspace.
- All specs and conversations scope under `project_id`, which scopes under `workspace_id`.
- `interview_state` tracks which schema sections are satisfied (drives the adaptive engine).
- `spec.schema_json` is the structured machine-readable handoff artifact; `markdown`
  is the human-readable render.
- Specs are **versioned** so regenerating never destroys a prior version.

## Interview engine & data flow

A schema-anchored adaptive loop:

1. **Init** — on project start, load the 7-section schema and an empty
   `interview_state` (every section "unsatisfied").
2. **Each turn** — the system prompt gives the model the schema, current
   `interview_state`, and conversation so far. Instruction: ask the single most
   valuable next question to fill the least-satisfied section; don't move on while
   a section is still fuzzy. One question at a time.
3. **State update** — after each user answer, the model emits (a) its next question
   and (b) a structured update of which sections are now satisfied, via a
   tool-call / structured-output field (reliable parsing, not regex on prose).
   Persisted to `interview_state`.
4. **Convergence** — when all sections are satisfied, the engine stops interviewing
   and offers to generate the spec.
5. **Generation** — a dedicated call takes the full conversation + schema and
   produces both `schema_json` and `markdown`, saved as a new spec version.
6. **Refine** — the developer can keep chatting to revise; regenerating bumps the version.

**Per-message data flow:** Chat UI → `/api/chat` (attaches user's key + system
prompt + state) → ai model (streamed) → response streams back to UI; structured
state-update persisted to `conversation`.

**Why this shape:** guarantees a complete spec (bounded by the schema) while feeling
like a natural conversation (adaptive ordering). Structured state makes "are we done
yet?" deterministic, not vibes.

## Error handling

Validate only at real boundaries.

- **User's API key** — invalid/expired key, rate limits (429), and ai model outages
  (5xx) surface as clear, actionable UI messages, never silent failures. Validated on
  first use; not stored server-side.
- **Streaming interruptions** — a dropped stream discards the partial message and the
  turn is retryable; `interview_state` only commits on a complete turn, so a dropped
  stream never corrupts state.
- **Spec generation failure** — the conversation is untouched and generation can be
  re-triggered; prior spec versions remain intact.
- **Magic-link / workspace** — unknown or malformed tokens return a clean
  "workspace not found" without leaking anything.
- **Everything else** — unexpected errors propagate rather than being swallowed; no
  fallbacks that mask bugs.

## Testing

- **Unit (pure logic):** `interview_state` transitions, convergence detection
  (all-satisfied → generate), spec schema validation, version bumping. The
  deterministic core; highest coverage.
- **Integration (I/O boundaries):** API routes with the ai model client mocked
  (only external services are mocked), magic-link workspace resolution against a
  test DB, persistence round-trips.
- **No mocking of internal modules** — engine logic is tested directly.
- **End-to-end happy path:** start project → answer through convergence → generate
  spec → reload via magic link.

## Deferred seams (designed for, not built)

These are documented extension points so future sub-projects plug in cleanly without
reworking the wedge:

- **Implementation module** — a future sub-project consumes `spec.schema_json` to
  produce an implementation plan and/or code. The wedge's responsibility is to
  produce an artifact good enough to hand off (to that module, or to an existing tool
  like Claude Code / Cursor).
- **Repo integration (GitHub/GitLab)** — a future integration attaches to a project
  in two directions: as a **destination** (commit `spec.md` to a repo) and, later, as
  **context** (ground the interview in an existing codebase).
