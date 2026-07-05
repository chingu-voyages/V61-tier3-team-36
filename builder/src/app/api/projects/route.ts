import { NextResponse } from "next/server";
import { createProject, listProjects } from "../../../../lib/project";
import { serializeProject } from "./project-response";
import { authenticateWorkspace } from "./workspace-auth";

export async function GET(request: Request) {
  const auth = await authenticateWorkspace(request);
  if (auth.response) {
    return auth.response;
  }

  const projects = await listProjects(auth.workspace.id);

  return NextResponse.json(projects.map(serializeProject));
}

export async function POST(request: Request) {
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

  const project = await createProject(auth.workspace.id, name);

  return NextResponse.json(serializeProject(project), { status: 201 });
}
