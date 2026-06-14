# Idea → Spec Platform — Work Breakdown

**Purpose:** A human-readable breakdown of the work for the first sub-project (idea → spec/PRD wedge), organized as epics and stories. Each story is ticket-ready: it carries a description, acceptance criteria, technical notes, and dependencies. Story IDs (e.g. `E2-S1`) are stable references for ticket creation.

**Source spec:** `docs/superpowers/specs/2026-06-12-idea-to-spec-design.md`

---

## Scope reminder

In scope: a web app where a solo developer is interviewed by an AI to turn a committed idea into a structured spec/PRD; multiple projects per magic-link workspace; bring-your-own ai model key. Out of scope (later sub-projects): market validation, implementation plan, work breakdown/issues, code generation, repo integration, full accounts.

---

## Suggested build sequence

The epics are ordered so each layer rests on the one before it:

1. **E1 — Foundations** (project setup, database)
2. **E2 — Interview engine** (the deterministic core)
3. **E3 — Spec generation**
4. **E4 — Data & persistence layer**
5. **E5 — API layer** (depends on E2, E3, E4)
6. **E6 — Web UI** (depends on E5)
7. **E7 — Quality & release** (cross-cutting, finish last)

Within the backend, E2 and E3 can be built in parallel with E4 since they share no code. E5 is the join point. E6 cannot start in earnest until E5 exists, though UI design/mockups can run in parallel earlier.

---

## E1 — Foundations

### E1-S1 — Project scaffolding
**Description:** Stand up the Next.js (App Router, TypeScript) project with a test runner and linting configured.
**Acceptance criteria:**
- A Next.js TypeScript app runs locally with `npm run dev`.
- The test command (`npm test`) executes and reports "no tests" cleanly on an empty suite.
- Linting runs without errors on the scaffold.
**Technical notes:** Vitest as the test runner (works for both Node logic and React components via jsdom). No CSS framework needed for v1.
**Dependencies:** None.

### E1-S2 — Database schema & connection
**Description:** Define the Postgres schema (`workspace`, `project`, `conversation`, `spec`) and a connection helper.
**Acceptance criteria:**
- A SQL schema file creates all four tables with the correct foreign keys and cascade-on-delete.
- The app can run a trivial query against the database using a `DATABASE_URL`.
- `conversation` is unique per project; `spec` carries an integer `version`.
**Technical notes:** Tables scope hierarchically: `spec` and `conversation` reference `project`, which references `workspace`. Store `messages` and `interview_state` as JSON columns. Provide a local Postgres (Docker) for development and tests.
**Dependencies:** E1-S1.

---

## E2 — Interview engine (deterministic core)

### E2-S1 — Spec schema definition
**Description:** Define the seven target spec sections (problem & goal, core features, scope & non-goals, user flows, constraints & assumptions, success criteria, open questions) with human labels and per-section guidance.
**Acceptance criteria:**
- The seven sections are defined as a single source of truth.
- Each section has a display label and a short description of what it captures.
**Technical notes:** This list drives both the interview targeting and the final spec structure — keep it in one module so everything stays in sync.
**Dependencies:** E1-S1.

### E2-S2 — Interview state & convergence logic
**Description:** Track which spec sections are "satisfied" during an interview and detect when all are satisfied (convergence).
**Acceptance criteria:**
- A fresh interview starts with all seven sections unsatisfied.
- Marking sections satisfied is additive (never drops previously satisfied ones) and ignores unknown section ids.
- "Converged" is true only when every section is satisfied.
- State transitions are immutable (inputs are not mutated).
**Technical notes:** Pure logic, no I/O — this is the most heavily tested unit. It's what makes "are we done?" deterministic rather than a judgment call.
**Dependencies:** E2-S1.

### E2-S3 — LLM client abstraction
**Description:** A thin interface over the ai agent so engine logic depends on an interface, not the SDK directly.
**Acceptance criteria:**
- A factory builds a client from a user-supplied API key and throws a clear error if the key is empty.
- The interface exposes a single "create message" method supporting system prompt, messages, tools, and forced tool choice.
**Technical notes:** The abstraction exists so the interview/spec logic can be tested with a fake client (the only thing we mock is this external boundary). Default to a current Claude model; make the model a constant.
**Dependencies:** E1-S1.

### E2-S4 — Interview turn engine
**Description:** Given the conversation so far and current state, produce the single next question and an updated state, using forced tool-use.
**Acceptance criteria:**
- The engine builds a system prompt that lists the still-unsatisfied sections and instructs "one question at a time."
- A turn returns the model's next question plus a merged state reflecting newly satisfied sections.
- If the model fails to return the structured tool call, the engine raises a clear error.
**Technical notes:** Each turn forces a tool (`update_interview`) whose arguments are the satisfied-section ids and the next question — so the satisfied signal is structured data, never parsed from prose. This is the key reliability decision.
**Dependencies:** E2-S1, E2-S2, E2-S3.

---

## E3 — Spec generation

### E3-S1 — Spec generator
**Description:** Turn a completed interview transcript into the final artifact: a Markdown spec plus a structured (machine-readable) form keyed by section.
**Acceptance criteria:**
- Generation returns both rendered Markdown and a structured object with all seven sections filled.
- If the model fails to return the structured spec, generation raises a clear error.
**Technical notes:** Force an `emit_spec` tool returning `markdown` and a `sections` object. The structured `sections` form is the implementation-ready handoff artifact for downstream sub-projects; the Markdown is the human-facing render.
**Dependencies:** E2-S1, E2-S3.

---

## E4 — Data & persistence layer

### E4-S1 — Workspace & project repository
**Description:** Create/fetch workspaces by magic token; create, list, rename, and delete projects scoped to a workspace.
**Acceptance criteria:**
- Creating a workspace produces a unique, hard-to-guess magic token.
- Projects are strictly scoped to their workspace (one workspace never sees another's projects).
- Rename and delete operate on a single project; deleting a project cascades to its conversation and specs.
**Technical notes:** The magic token is the credential — treat it as a secret-bearing URL. Generate it with a cryptographically strong random source.
**Dependencies:** E1-S2.

### E4-S2 — Conversation persistence
**Description:** Store and update a project's interview transcript and current interview state.
**Acceptance criteria:**
- A project has exactly one conversation, created on first access with an empty transcript and a fresh state.
- Saving updates both the message list and the interview state atomically.
**Technical notes:** State only commits on a complete turn (see E5-S2), so a dropped/failed turn never persists partial state.
**Dependencies:** E1-S2, E2-S2.

### E4-S3 — Spec versioning & retrieval
**Description:** Persist each generated spec as a new version and fetch the latest.
**Acceptance criteria:**
- The first spec for a project is version 1; each regeneration increments the version.
- Retrieving "latest" returns the highest-version spec; older versions are retained, not overwritten.
**Technical notes:** Versioning means regenerating after edits never destroys prior output. A version-history UI is deferred, but the data must support it now.
**Dependencies:** E1-S2.

---

## E5 — API layer

### E5-S1 — Workspace & projects endpoints
**Description:** HTTP endpoints to create a workspace and to list/create/rename/delete projects.
**Acceptance criteria:**
- Creating a workspace returns its magic token.
- Listing/creating projects requires a valid workspace token; an unknown token returns "not found" (404) without leaking data.
- Creating a project without a name returns a validation error (400).
**Technical notes:** Validate only at this boundary (token presence/validity, required fields). Let unexpected errors propagate rather than masking them.
**Dependencies:** E4-S1.

### E5-S2 — Chat (interview turn) endpoint
**Description:** Accept a user message for a project, run one interview turn, persist the result, and return the next question plus whether the interview has converged.
**Acceptance criteria:**
- A missing API key header returns 401 with a clear message.
- A successful turn returns the next question and a `converged` flag, and persists the appended messages + new state.
- An upstream model/tool failure returns a 502-class error with an actionable message; the conversation is left consistent.
**Technical notes:** The user's ai model key arrives in a request header, is used transiently to build the LLM client, and is never stored server-side. Persist state only after a complete, successful turn.
**Dependencies:** E2-S4, E4-S2.

### E5-S3 — Spec generation & retrieval endpoint
**Description:** Generate a spec from a project's conversation (saving a new version) and fetch the latest spec.
**Acceptance criteria:**
- A missing API key header returns 401.
- Generation saves a new version and returns the Markdown + version number.
- A generation failure leaves the conversation and prior specs untouched and returns an actionable error.
- Fetching the latest spec for a project with none returns "not found" (404).
**Technical notes:** Same transient-key handling as E5-S2. Generation reads the stored transcript, so it works even if the client reconnected.
**Dependencies:** E3-S1, E4-S2, E4-S3.

---

## E6 — Web UI

### E6-S1 — BYO API key gate
**Description:** Collect the user's ai model key, store it in the browser, and gate the app behind its presence.
**Acceptance criteria:**
- With no stored key, the user is prompted for one and app content is hidden.
- After saving, the key persists across reloads (browser-local) and content is revealed.
- Copy reassures the user the key stays in their browser and is sent directly with requests.
**Technical notes:** Store in `localStorage`; send only as a per-request header to our own endpoints. Never transmit the key to any third party other than Anthropic via our proxy.
**Dependencies:** E5-S2 (for it to be useful end-to-end), but buildable against a stub earlier.

### E6-S2 — Workspace bootstrap & dashboard
**Description:** First visit creates a workspace and lands the user on a stable workspace URL listing their projects, with create/open.
**Acceptance criteria:**
- Visiting the root creates a workspace and redirects to its URL.
- The dashboard lists existing projects and lets the user create a new one and open it.
- Clear guidance tells the user to bookmark the URL (it's their workspace key).
**Technical notes:** The workspace URL embeds the magic token. Rename/delete UI is deferred (API exists); v1 surfaces create/open.
**Dependencies:** E5-S1.

### E6-S3 — Interview chat UI
**Description:** A conversational surface that sends messages to the chat endpoint and renders the running transcript.
**Acceptance criteria:**
- The user can type a message and see both their message and the AI's next question appear.
- Errors (e.g. rejected key, upstream failure) surface as a readable message, not a silent failure.
- When a turn reports convergence, the UI reveals the spec-generation step.
**Technical notes:** One question at a time; disable send while a turn is in flight. Streaming is deferred — show the full question when the turn returns.
**Dependencies:** E5-S2, E6-S1.

### E6-S4 — Spec view & export
**Description:** Trigger spec generation, display the result, and allow download.
**Acceptance criteria:**
- A "Generate spec" action produces and displays the spec, labeled with its version.
- The user can download the spec as a `.md` file.
- Generation errors surface readably; the user can retry.
**Technical notes:** v1 renders Markdown as preformatted text; rich rendering is a documented enhancement.
**Dependencies:** E5-S3, E6-S1.

### E6-S5 — Project page assembly
**Description:** Compose the key gate, chat, and spec view into a single project workspace page.
**Acceptance criteria:**
- Opening a project shows the interview; once converged, the spec section becomes available on the same page.
- The whole page is gated behind the API key.
**Technical notes:** Pure composition of E6-S1/S3/S4; no new logic.
**Dependencies:** E6-S1, E6-S3, E6-S4.

---

## E7 — Quality & release

### E7-S1 — End-to-end happy-path verification
**Description:** A test that drives the full backend loop: create workspace → project → interview to convergence → generate spec → fetch latest.
**Acceptance criteria:**
- With a scripted fake model, the flow reaches convergence and produces a retrievable version-1 spec.
- The test runs in CI alongside the unit/integration suites.
**Technical notes:** Use the LLM client abstraction (E2-S3) to inject a scripted fake; no real API calls in CI.
**Dependencies:** E5-S1, E5-S2, E5-S3.

### E7-S2 — Deployment & environment setup
**Description:** Deploy the app with a managed Postgres and the required environment configuration.
**Acceptance criteria:**
- The app is reachable at a public URL.
- A managed Postgres is provisioned and the schema applied.
- Secrets/config (database URL) are set via environment, not committed.
**Technical notes:** No server-side AI key — users bring their own. Add basic rate limiting only if abuse appears (deferred otherwise).
**Dependencies:** E1-S2, E5-*, E6-*.

---

## Deferred (not in this breakdown — future sub-projects or enhancements)

- Streaming interview responses.
- Rich Markdown rendering and spec version-history UI.
- Project rename/delete in the UI.
- Implementation module consuming the structured spec.
- Repo integration (GitHub/GitLab) as spec destination, later as interview context.
- Full accounts (beyond magic-link workspaces).
- Market validation / "should I build this?" discovery.
