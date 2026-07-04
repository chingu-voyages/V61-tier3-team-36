import { NextResponse } from "next/server";
import { deleteProject, renameProject } from "../../../../../lib/project";
import { authenticateWorkspace } from "../workspace-auth";

interface ProjectRouteContext {
  params: Promise<{
    projectId: string;
  }>;
}

export async function PATCH(request: Request, context: ProjectRouteContext) {
  const auth = await authenticateWorkspace(request);
  if (auth.response) {
    return auth.response;
  }

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name : "";

  if (name.trim() === "") {
    return NextResponse.json(
      { error: "Project name is required" },
      { status: 400 }
    );
  }

  const { projectId } = await context.params;
  const project = await renameProject(auth.workspace.id, projectId, name);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(project);
}

export async function DELETE(request: Request, context: ProjectRouteContext) {
  const auth = await authenticateWorkspace(request);
  if (auth.response) {
    return auth.response;
  }

  const { projectId } = await context.params;
  const deleted = await deleteProject(auth.workspace.id, projectId);

  if (!deleted) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
