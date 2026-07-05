import { notFound } from "next/navigation";
import { getWorkspaceByMagicToken } from "../../../../lib/workspace";
import { listProjects } from "../../../../lib/project";
import WorkspaceDashboardClient from "./WorkspaceDashboardClient";

interface WorkspacePageProps {
  params: Promise<{
    magicToken: string;
  }>;
}

export default async function WorkspacePage(props: WorkspacePageProps) {
  const { magicToken } = await props.params;

  let workspace;
  try {
    workspace = await getWorkspaceByMagicToken(magicToken);
  } catch (error) {
    console.error("Failed to load workspace", error);
    notFound();
  }

  if (!workspace) {
    notFound();
  }

  let projects: import("../../../../lib/project").Project[] = [];
  try {
    projects = await listProjects(workspace.id);
  } catch (error) {
    console.error("Failed to list projects", error);
  }

  // Convert Date objects to strings for Client Component boundary serialization safety in Next.js 15+
  const serializedProjects = projects.map(p => ({
    id: p.id,
    name: p.name,
    status: p.status,
    created_at: p.created_at.toISOString() as any, // Cast to avoid TS serialization issues
  }));

  return (
    <WorkspaceDashboardClient
      magicToken={magicToken}
      initialProjects={serializedProjects}
    />
  );
}
