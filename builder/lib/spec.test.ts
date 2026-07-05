import { describe, expect, it } from "vitest";
import {
  createSpecVersion,
  getLatestSpec,
  type Spec,
} from "./spec";

type JsonValue = unknown;

type FakeDb = {
  begin<T>(callback: (tx: FakeDb) => Promise<T>): Promise<T>;
  json(value: JsonValue): JsonValue;
} & (<T>(strings: TemplateStringsArray, ...values: JsonValue[]) => Promise<T>);

function createFakeDb(existingProjectIds: string[] = ["project-1"]) {
  const projectIds = new Set(existingProjectIds);
  const specs: Spec[] = [];
  const writes: string[] = [];

  const db = (async <T>(
    strings: TemplateStringsArray,
    ...values: JsonValue[]
  ): Promise<T> => {
    const query = strings.join(" ");
    writes.push(query);

    if (query.includes("SELECT id") && query.includes("FROM project")) {
      const projectId = values[0] as string;
      return (projectIds.has(projectId) ? [{ id: projectId }] : []) as T;
    }

    if (query.includes("INSERT INTO spec")) {
      const projectId = values[0] as string;
      const markdown = values[1] as string;
      const schemaJson = values[2];
      const projectSpecs = specs.filter((spec) => spec.project_id === projectId);
      const nextVersion =
        Math.max(0, ...projectSpecs.map((spec) => spec.version)) + 1;

      const spec: Spec = {
        id: `spec-${specs.length + 1}`,
        project_id: projectId,
        markdown,
        schema_json: schemaJson,
        version: nextVersion,
        created_at: new Date(`2026-01-0${nextVersion}T00:00:00.000Z`),
      };
      specs.push(spec);
      return [spec] as T;
    }

    if (
      query.includes("SELECT id, project_id, markdown, schema_json, version, created_at") &&
      query.includes("ORDER BY version DESC")
    ) {
      const projectId = values[0] as string;
      const [latest] = specs
        .filter((spec) => spec.project_id === projectId)
        .sort((a, b) => b.version - a.version);
      return (latest ? [latest] : []) as T;
    }

    throw new Error(`Unexpected query: ${query}`);
  }) as FakeDb;

  db.begin = async <T>(callback: (tx: FakeDb) => Promise<T>) => callback(db);
  db.json = (value: JsonValue) => value;

  return { db, specs, writes };
}

describe("spec repository", () => {
  it("stores the first generated spec as version 1", async () => {
    const { db } = createFakeDb();

    const spec = await createSpecVersion("project-1", "# Spec", {
      problem: "clear",
    }, db);

    expect(spec.version).toBe(1);
    expect(spec.markdown).toBe("# Spec");
    expect(spec.schema_json).toEqual({ problem: "clear" });
  });

  it("increments regenerated spec versions without overwriting older versions", async () => {
    const { db, specs } = createFakeDb();

    const first = await createSpecVersion("project-1", "# Version 1", {}, db);
    const second = await createSpecVersion("project-1", "# Version 2", {}, db);

    expect(first.version).toBe(1);
    expect(second.version).toBe(2);
    expect(specs).toHaveLength(2);
    expect(specs.map((spec) => spec.markdown)).toEqual([
      "# Version 1",
      "# Version 2",
    ]);
  });

  it("returns the highest-version spec as latest", async () => {
    const { db } = createFakeDb();
    await createSpecVersion("project-1", "# Version 1", {}, db);
    await createSpecVersion("project-1", "# Version 2", {}, db);

    const latest = await getLatestSpec("project-1", db);

    expect(latest?.version).toBe(2);
    expect(latest?.markdown).toBe("# Version 2");
  });

  it("returns null when a project has no specs", async () => {
    const { db } = createFakeDb();

    await expect(getLatestSpec("project-1", db)).resolves.toBeNull();
  });

  it("uses a project row lock before assigning the next version", async () => {
    const { db, writes } = createFakeDb();

    await createSpecVersion("project-1", "# Spec", {}, db);

    expect(writes[0]).toContain("FOR UPDATE");
  });
});
