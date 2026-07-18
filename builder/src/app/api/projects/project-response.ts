import type { Project } from "../../../../lib/project";

export function serializeProject(project: Project) {
  return {
    id: project.id,
    workspace_id: project.workspace_id,
    name: project.name,
    status: project.status,
    created_at: project.created_at.toISOString(),
  };
}
