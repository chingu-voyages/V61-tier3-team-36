import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getOrCreateConversation, saveConversationTurn } from "../../../../lib/conversation";
import { InterviewEngine } from "../../../../lib/interview-engine";
import { isConverged } from "../../../../lib/interview-state";
import { createLLMClient } from "../../../../lib/llm-client";
import { getProjectInWorkspace } from "../../../../lib/project";
import { authenticateWorkspace } from "../projects/workspace-auth";

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
  const message = typeof body.message === "string" ? body.message : "";

  if (projectId.trim() === "") {
    return NextResponse.json(
      { error: "Project id is required" },
      { status: 400 }
    );
  }

  if (message.trim() === "") {
    return NextResponse.json(
      { error: "Message is required" },
      { status: 400 }
    );
  }

  const project = await getProjectInWorkspace(auth.workspace.id, projectId);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const conversation = await getOrCreateConversation(project.id);

  if (isConverged(conversation.interview_state)) {
    return NextResponse.json(
      { error: "Interview has already converged" },
      { status: 400 }
    );
  }

  const messages = [
    ...conversation.messages,
    { role: "user" as const, content: message },
  ];
  const engine = new InterviewEngine(createLLMClient(apiKey));

  let turn;
  try {
    turn = await engine.runTurn({
      state: conversation.interview_state,
      messages,
    });
} catch (error) {
    const isUpstreamFailure = error instanceof Error;
    if (isUpstreamFailure) {
      return NextResponse.json(
        {
          error:
            "Interview turn failed while calling the AI model. Check your API key and try again.",
        },
        { status: 502 }
      );
    }
    throw error;
  }
  await saveConversationTurn(project.id, turn.updatedMessages, turn.updatedState);

  return NextResponse.json({
    nextQuestion: turn.nextQuestion,
    converged: isConverged(turn.updatedState),
  });
}