import sql from "./db";

export interface Spec {
  id: string;
  project_id: string;
  markdown: string;
  schema_json: unknown;
  version: number;
  created_at: Date;
}

type JsonValue = unknown;

type SpecDb = {
  begin<T>(callback: (tx: SpecDb) => Promise<T>): Promise<T>;
  json(value: JsonValue): JsonValue;
} & (<T>(
  strings: TemplateStringsArray,
  ...values: JsonValue[]
) => Promise<T>);

const defaultDb = sql as unknown as SpecDb;

export async function createSpecVersion(
  projectId: string,
  markdown: string,
  schemaJson: unknown,
  db: SpecDb = defaultDb
): Promise<Spec> {
  if (markdown.trim() === "") {
    throw new Error("Spec markdown cannot be empty");
  }

  return db.begin(async (tx) => {
    const [project] = await tx<{ id: string }[]>`
      SELECT id
      FROM project
      WHERE id = ${projectId}
      FOR UPDATE
    `;

    if (!project) {
      throw new Error("Project not found");
    }

    const [spec] = await tx<Spec[]>`
      INSERT INTO spec (project_id, markdown, schema_json, version)
      SELECT
        ${projectId},
        ${markdown},
        ${db.json(schemaJson)},
        COALESCE(MAX(version), 0) + 1
      FROM spec
      WHERE project_id = ${projectId}
      RETURNING id, project_id, markdown, schema_json, version, created_at
    `;

    return spec;
  });
}

export async function getLatestSpec(
  projectId: string,
  db: SpecDb = defaultDb
): Promise<Spec | null> {
  const [spec] = await db<Spec[]>`
    SELECT id, project_id, markdown, schema_json, version, created_at
    FROM spec
    WHERE project_id = ${projectId}
    ORDER BY version DESC
    LIMIT 1
  `;

  return spec ?? null;
}
