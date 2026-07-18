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

  // Improvement 1: Add JSON parsing validation
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

  // Improvement 3: Fetch the single project directly
  const project = await getProjectInWorkspace(auth.workspace.id, projectId);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const conversation = await getOrCreateConversation(project.id);

  // Improvement 2: Check if already converged before calling the engine
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
    // Distinguish between upstream model/tool failures and internal server errors
    const isUpstreamFailure =
      error instanceof Anthropic.AnthropicError || // Catches all Anthropic SDK errors (API errors, rate limits, connection issues)
      (error instanceof Error &&
        (error.message.includes("Model failed to return the structured tool call") ||
         error.message.includes("Model returned malformed tool input"))); // Catches our custom engine errors for bad model output

    if (isUpstreamFailure) {
      return NextResponse.json(
        {
          error:
            "Interview turn failed while calling the AI model. Check your API key and try again.",
        },
        { status: 502 }
      );
    }

    // For any other unexpected errors (e.g., database issues, internal bugs), return 500
    console.error("Unexpected internal error during interview turn:", error);
    return NextResponse.json(
      { error: "An unexpected internal error occurred." },
      { status: 500 }
    );
  }

  await saveConversationTurn(project.id, turn.updatedMessages, turn.updatedState);

  return NextResponse.json({
    nextQuestion: turn.nextQuestion,
    converged: isConverged(turn.updatedState),
  });
}
