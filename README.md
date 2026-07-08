# SpecForge

SpecForge is a Next.js app for turning a product idea into a structured spec/PRD. The platform provides a workspace-based environment where developers interact with an AI interviewer to satisfy product requirements, compile versioned specifications, and prepare delivery workflows.

## Repository Layout

```text
.
+-- builder/                 # Next.js application
|   +-- db/schema.sql        # PostgreSQL schema
|   +-- lib/                 # Repository and domain logic
|   +-- src/app/             # App Router pages and API routes
+-- docs/                    # Planning docs and team artifacts
+-- plans/                   # Work breakdowns and ticket plans
+-- specs/                   # Product/spec documents
```

## Core Features

* **Workspace Bootstrapping**: Dynamic workspace URL creation at `/workspace/[magicToken]` on first visit; persistent and bookmarkable workspace access keys.
* **Projects Dashboard**: List, open, and create projects inside your tokenized workspace.
* **API Key Gate**: Secure, client-side overlay prompting for an Anthropic API Key. Stored in `localStorage` and sent over HTTPS request headers; supports `env` bypass.
* **Conversational Spec Interview**: Guides users through 7 required spec sections (e.g. Problems, Features, Scopes, Flow, Constraints) with real-time progress checklist tracking.
* **Spec View & Export**: Renders compiled versioned specs in a preformatted scrollable block and supports downloading as `.md` file exports.
* **Split Grid Workspace**: Transitions into a split layout presenting the Spec Document on the left column and the scrollable Interview History on the right column.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- PostgreSQL
- `postgres` Node client
- Anthropic SDK for LLM calls
- Vitest for tests
- ESLint with Next.js config

## Required Installations

Install these on your machine before running the project:

- Node.js 20 or newer
- npm, included with Node.js
- PostgreSQL 14 or newer
- Git

Optional but useful:

- Docker Desktop, if you prefer running PostgreSQL in a container
- A database GUI such as TablePlus, pgAdmin, or DBeaver

## Install Project Libraries

All JavaScript libraries are declared in [builder/package.json](./builder/package.json) and locked in [builder/package-lock.json](./builder/package-lock.json).

```bash
cd builder
npm install
```

You do not need to install `next`, `react`, `typescript`, `vitest`, or the other packages manually. `npm install` installs everything used by the app.

## Environment Setup

Create `builder/.env`:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/specforge
```

`DATABASE_URL` is required by [builder/lib/db.ts](./builder/lib/db.ts). Do not commit real secrets.

The Anthropic SDK is installed because the interview engine uses an LLM client. The current helper accepts an API key when the client is created, so there is no required global Anthropic environment variable yet. If a future route or UI flow reads one from the environment, use a local-only value such as:

```env
ANTHROPIC_API_KEY=your-api-key
```

## Database Setup

Create and configure your local PostgreSQL database. If you are on macOS using Homebrew and encounter symlink conflicts with a preinstalled `libpq` package, resolve them with the following sequence:

```bash
# Unlink libpq and overwrite-link the postgresql server formula
brew unlink libpq
brew link --overwrite postgresql@16
brew postinstall postgresql@16
brew services start postgresql@16
```

Next, configure the database user and password (`postgres:postgres`) to match the `.env` connection string:

```bash
# Create the postgres superuser (if not already created)
createuser -s postgres

# Set the password to 'postgres'
psql postgres -c "ALTER USER postgres WITH PASSWORD 'postgres';"

# Create the specforge database
createdb -U postgres specforge

# Load the database schema
psql -U postgres -d specforge -f db/schema.sql
```

If PostgreSQL reports that `gen_random_uuid()` is unavailable, enable the extension once in the database:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

Then rerun the schema command.

## Running The App

From the `builder` directory:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

### API Key Gate Configuration

Upon visiting the workspace or project pages, you will be prompted to enter your Anthropic API Key:
* **Local Storage**: The key is stored strictly locally in your browser's `localStorage` and is only sent via HTTPS request headers to our own backend proxy endpoints.
* **Developer Bypass**: If you have `ANTHROPIC_API_KEY` configured in the server's `builder/.env` file, you can enter `env` in the UI prompt to bypass the client-side gate and use the server's environment variable.
* **Updating/Clearing Key**: You can click the settings gear widget floating in the bottom-right of the page to modify or clear your API key at any time.

## Available Scripts

Run these from `builder/`:

```bash
npm run dev      # Start the local Next.js dev server
npm run build    # Build the production app
npm run start    # Start the built production app
npm run lint     # Run ESLint
npm test         # Run Vitest
```

Type-check manually with:

```bash
npx tsc --noEmit
```

## HTTP API

### Create Workspace

```http
POST /api/workspaces
```

Returns:

```json
{
  "magicToken": "workspace-token"
}
```

### Project & Chat Endpoints

All project and conversation endpoints require a valid workspace token:

```http
X-Workspace-Token: workspace-token
```

Additionally, the conversation and spec generation `POST` endpoints require a client-supplied Anthropic API key:

```http
X-Anthropic-Api-Key: sk-ant-...
```

*(Note: If the server has a fallback key configured in `.env`, developers can send `env` in this header to bypass the client gate).*

#### Projects CRUD:
```http
GET /api/projects
POST /api/projects
PATCH /api/projects/:projectId
DELETE /api/projects/:projectId
```

#### Conversational Interview Chat:
```http
GET /api/projects/:projectId/conversation    # Retrieve active chat and checklist progress
POST /api/projects/:projectId/conversation   # Run a chat turn (takes {"message": "..."})
```

#### Spec Generation:
```http
GET /api/projects/:projectId/spec            # Retrieve the latest generated spec
POST /api/projects/:projectId/spec           # Compile the specification document once converged
```

Expected validation behavior:

- Missing workspace token returns `400`
- Unknown workspace token returns `404`
- Missing or empty parameters/inputs returns `400`
- Project not found for operations returns `404`

## Data Model

The schema defines:

- `workspace`: magic-link workspace identity
- `project`: projects scoped to a workspace
- `conversation`: one interview conversation per project
- `spec`: generated Markdown and structured JSON specs, versioned per project

Generated specs are append-only by version. The first spec for a project is version `1`; regenerating creates version `2`, `3`, and so on.

## Development Notes

- Keep SQL inside repository modules in `builder/lib`.
- Keep App Router handlers thin: parse requests, validate boundary inputs, authenticate workspace tokens, call repositories, and return JSON.
- Let unexpected errors propagate through Next.js instead of hiding them behind generic API responses.
- Add focused Vitest coverage for repository behavior and route boundary behavior.

## Team Documents

- [Team Project Ideas](./docs/team_project_ideas.md)
- [Team Decision Log](./docs/team_decision_log.md)
- [Idea-to-spec design](./specs/2026-06-12-idea-to-spec-design.md)
- [Work breakdown](./plans/2026-06-12-idea-to-spec-work-breakdown.md)
