import sql from "./db";

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  status: string;
  created_at: Date;
}

export async function createProject(
  workspaceId: string,
  name: string
): Promise<Project> {
  const trimmed = name.trim();
  if (trimmed === "") {
    throw new Error("Project name cannot be empty");
  }

  const [project] = await sql<Project[]>`
    INSERT INTO project (workspace_id, name)
    VALUES (${workspaceId}, ${trimmed})
    RETURNING id, workspace_id, name, status, created_at
  `;
  return project;
}

export async function listProjects(workspaceId: string): Promise<Project[]> {
  return sql<Project[]>`
    SELECT id, workspace_id, name, status, created_at
    FROM project
    WHERE workspace_id = ${workspaceId}
    ORDER BY created_at DESC
  `;
}

export async function renameProject(
  workspaceId: string,
  projectId: string,
  newName: string
): Promise<Project | null> {
  const [project] = await sql<Project[]>`
    UPDATE project
    SET name = ${newName}
    WHERE id = ${projectId}
      AND workspace_id = ${workspaceId}
    RETURNING id, workspace_id, name, status, created_at
  `;
  return project ?? null;
}

export async function deleteProject(
  workspaceId: string,
  projectId: string
): Promise<boolean> {
  const result = await sql`
    DELETE FROM project
    WHERE id = ${projectId}
      AND workspace_id = ${workspaceId}
  `;
  return (result.count ?? 0) > 0;
}