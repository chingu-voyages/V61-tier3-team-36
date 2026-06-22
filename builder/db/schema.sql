CREATE TABLE workspace (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  magic_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE project (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE conversation (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID NOT NULL UNIQUE REFERENCES project(id) ON DELETE CASCADE,
  messages         JSONB NOT NULL DEFAULT '[]',
  interview_state  JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE spec (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  markdown     TEXT NOT NULL DEFAULT '',
  schema_json  JSONB NOT NULL DEFAULT '{}',
  version      INTEGER NOT NULL DEFAULT 1,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);