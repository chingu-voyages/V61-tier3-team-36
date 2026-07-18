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
  
   console.log("Route magic token:", magicToken);

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

  return (
    <WorkspaceDashboardClient
      magicToken={magicToken}
      initialProjects={projects}
    />
  );
}
