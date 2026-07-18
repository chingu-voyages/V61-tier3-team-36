import { notFound } from "next/navigation";
import sql from "../../../../../../lib/db";
import { getWorkspaceByMagicToken } from "../../../../../../lib/workspace";
import { getOrCreateConversation } from "../../../../../../lib/conversation";
import { getLatestSpec } from "../../../../../../lib/spec";
import ProjectDetailClient from "./ProjectDetailClient";

interface ProjectPageProps {
  params: Promise<{
    magicToken: string;
    projectId: string;
  }>;
}

export default async function ProjectPage(props: ProjectPageProps) {
  const { magicToken, projectId } = await props.params;

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

  // Verify project ownership
  let project;
  console.log("Workspace ID:", workspace.id);
  console.log("Project ID:", projectId);
  try {
    const rows = await sql<{
  id: string;
  name: string;
  workspace_id: string;
}[]>`
  SELECT id, name, workspace_id
  FROM project
  WHERE id = ${projectId}
`;

console.log("Rows returned:", rows);

const [row] = rows;
project = row;
    project = row;
  } catch (error) {
    console.error("Failed to retrieve project details", error);
  }

  if (!project) {
  console.log("Project not found in page.tsx");
  notFound();
}
  // Fetch or create conversation and latest spec
  let conversation;
  let latestSpec = null;
  try {
    conversation = await getOrCreateConversation(projectId);
    latestSpec = await getLatestSpec(projectId);
  }  catch (error) {
  console.error("Failed to initialize conversation or spec", error);
  notFound();
}

  // Serialize Date objects to strings for Client Component boundary safety
  const serializedConversation = {
    messages: conversation.messages,
    interview_state: {
      satisfiedSectionIds: [...conversation.interview_state.satisfiedSectionIds],
    },
  };

  const serializedSpec = latestSpec
    ? {
        id: latestSpec.id,
        project_id: latestSpec.project_id,
        markdown: latestSpec.markdown,
        schema_json: latestSpec.schema_json,
        version: latestSpec.version,
        created_at: latestSpec.created_at.toISOString(),
      }
    : null;

  return (
    <ProjectDetailClient
      magicToken={magicToken}
      projectId={projectId}
      projectName={project.name}
      initialConversation={serializedConversation}
      initialSpec={serializedSpec}
    />
  );
}
