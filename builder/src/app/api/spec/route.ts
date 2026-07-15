import { NextResponse } from "next/server";
import { getOrCreateConversation } from "../../../../lib/conversation";
import { isConverged } from "../../../../lib/interview-state";
import { createLLMClient } from "../../../../lib/llm-client";
import { getProjectInWorkspace } from "../../../../lib/project";
import { generateSpec } from "../../../../lib/spec-generator";
import { createSpecVersion, getLatestSpec } from "../../../../lib/spec";
import { authenticateWorkspace } from "../projects/workspace-auth";
import Anthropic from "@anthropic-ai/sdk";

const AI_MODEL_KEY_HEADER = "X-AI-Model-Key";

export async function POST(request: Request) {
  const apiKey = request.headers.get(AI_MODEL_KEY_HEADER);

  if (!apiKey || apiKey.trim() === "") {
    return NextResponse.json(
      { error: "AI model API key is required" },
      { status: 401 }
    );
  }

  const auth = await authenticateWorkspace(request);
  if (auth.response) {
    return auth.response;
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  const projectId = typeof body.projectId === "string" ? body.projectId : "";

  if (projectId.trim() === "") {
    return NextResponse.json(
      { error: "Project id is required" },
      { status: 400 }
    );
  }

  const project = await getProjectInWorkspace(auth.workspace.id, projectId);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const conversation = await getOrCreateConversation(project.id);

  if (!isConverged(conversation.interview_state)) {
    return NextResponse.json(
      { error: "Interview must be converged before generating a spec" },
      { status: 400 }
    );
  }

  const client = createLLMClient(apiKey);

let generatedSpec;

try {
  generatedSpec = await generateSpec(
    client,
    conversation.messages
  );
} catch (error) {
  const isUpstreamFailure = error instanceof Error;
  if (isUpstreamFailure) {
    return NextResponse.json(
      {
        error:
          "Specification generation failed while calling the AI model. Check your API key and try again.",
      },
      { status: 502 }
    );
  }
  throw error;
}
  const spec = await createSpecVersion(
    project.id,
    generatedSpec.markdown,
    generatedSpec.sections
  );

  return NextResponse.json(
    {
      markdown: spec.markdown,
      version: spec.version,
    },
    { status: 201 }
  );
}

export async function GET(request: Request) {
  const auth = await authenticateWorkspace(request);
  if (auth.response) {
    return auth.response;
  }

  const projectId = new URL(request.url).searchParams.get("projectId") ?? "";

  if (projectId.trim() === "") {
    return NextResponse.json(
      { error: "Project id is required" },
      { status: 400 }
    );
  }

  const project = await getProjectInWorkspace(auth.workspace.id, projectId);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const spec = await getLatestSpec(project.id);

  if (!spec) {
    return NextResponse.json(
      { error: "Specification not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    markdown: spec.markdown,
    version: spec.version,
  });
}
