import { NextResponse } from "next/server";
import sql from "../../../../../../lib/db";
import { getLatestSpec, createSpecVersion } from "../../../../../../lib/spec";
import { getOrCreateConversation } from "../../../../../../lib/conversation";
import { isConverged } from "../../../../../../lib/interview-state";
import { generateSpec } from "../../../../../../lib/spec-generator";
import { createLLMClient } from "../../../../../../lib/llm-client";
import { authenticateWorkspace } from "../../workspace-auth";

interface ProjectRouteContext {
  params: Promise<{
    projectId: string;
  }>;
}

export async function GET(request: Request, context: ProjectRouteContext) {
  const auth = await authenticateWorkspace(request);
  if (auth.response) {
    return auth.response;
  }

  const { projectId } = await context.params;

  // Verify project ownership within workspace
  const [project] = await sql`
    SELECT id 
    FROM project 
    WHERE id = ${projectId} AND workspace_id = ${auth.workspace.id}
  `;
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const spec = await getLatestSpec(projectId);
    return NextResponse.json(spec);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to retrieve spec" }, { status: 500 });
  }
}

export async function POST(request: Request, context: ProjectRouteContext) {
  const auth = await authenticateWorkspace(request);
  if (auth.response) {
    return auth.response;
  }

  const { projectId } = await context.params;

  // Verify project ownership within workspace
  const [project] = await sql`
    SELECT id 
    FROM project 
    WHERE id = ${projectId} AND workspace_id = ${auth.workspace.id}
  `;
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const conversation = await getOrCreateConversation(projectId);

    if (!isConverged(conversation.interview_state)) {
      return NextResponse.json(
        { error: "Cannot generate specification. The interview conversation has not converged yet." },
        { status: 400 }
      );
    }

    let apiKey = request.headers.get("X-Anthropic-Api-Key") || "";
    if (apiKey.trim() === "" || apiKey === "env") {
      apiKey = process.env.ANTHROPIC_API_KEY || "";
    }

    if (!apiKey || apiKey.trim() === "") {
      return NextResponse.json(
        { error: "Anthropic API key is required. Please set up your API Key in the settings gear or server configuration." },
        { status: 400 }
      );
    }

    const llmClient = createLLMClient(apiKey);
    const specOutput = await generateSpec(llmClient, conversation.messages);

    const spec = await createSpecVersion(projectId, specOutput.markdown, specOutput.sections);

    return NextResponse.json(spec, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "An error occurred while generating the specification." },
      { status: 500 }
    );
  }
}
