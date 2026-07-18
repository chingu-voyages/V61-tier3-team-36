/**
 * @file route.ts (conversation)
 * @description API endpoint handler for project conversational intake sessions. Resolves workspace
 * authentication, queries conversation history, processes incoming turns using the AI InterviewEngine
 * and client-supplied headers key, and logs state changes.
 */

import { NextResponse } from "next/server";
import sql from "../../../../../../lib/db";
import { getOrCreateConversation, saveConversationTurn } from "../../../../../../lib/conversation";
import { isConverged } from "../../../../../../lib/interview-state";
import { createLLMClient } from "../../../../../../lib/llm-client";
import { InterviewEngine } from "../../../../../../lib/interview-engine";
import { authenticateWorkspace } from "../../workspace-auth";

interface ProjectRouteContext {
  params: Promise<{
    projectId: string;
  }>;
}

/**
 * GET handler: Retrieves the active conversation messages history and checklist progress
 * states for a project, verifying workspace security constraints first.
 */
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
    const conversation = await getOrCreateConversation(projectId);
    return NextResponse.json(conversation);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message || "Failed to retrieve conversation" }, { status: 500 });
  }
}

/**
 * POST handler: Executes an intake interview turn. Extracts custom user API Key headers,
 * invokes InterviewEngine to satisfy checkpoints, saves progress, and returns next clarifying question.
 */
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

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const userMessage = typeof body.message === "string" ? body.message.trim() : "";
  if (userMessage === "") {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  try {
    const conversation = await getOrCreateConversation(projectId);

    if (isConverged(conversation.interview_state)) {
      return NextResponse.json(
        { error: "Interview is already completed and converged." },
        { status: 400 }
      );
    }

    const updatedMessages = [
      ...conversation.messages,
      { role: "user" as const, content: userMessage },
    ];

    // --- PROVIDER & API KEY RESOLUTION ---
    const providerHeader = request.headers.get("X-Api-Provider");
    const validProviders = ["anthropic", "openai", "gemini"] as const;
    type AIProvider = typeof validProviders[number];
    
    // Safely resolve provider, defaulting to "anthropic" if missing or invalid
    const provider: AIProvider = validProviders.includes(providerHeader as AIProvider)
      ? (providerHeader as AIProvider)
      : "anthropic";

    // Centralized configuration for headers, environment fallbacks, and display names
    const providerSettings: Record<AIProvider, { header: string; envKey: string | undefined; displayName: string }> = {
      anthropic: {
        header: "X-Anthropic-Api-Key",
        envKey: process.env.ANTHROPIC_API_KEY,
        displayName: "Anthropic",
      },
      openai: {
        header: "X-OpenAI-Api-Key",
        envKey: process.env.OPENAI_API_KEY,
        displayName: "OpenAI",
      },
      gemini: {
        header: "X-Gemini-Api-Key",
        envKey: process.env.GEMINI_API_KEY,
        displayName: "Google Gemini",
      },
    };

    const settings = providerSettings[provider];
    let apiKey = request.headers.get(settings.header) || "";

    // Support the "env" keyword to fall back to server environment variables
    if (apiKey.trim() === "" || apiKey === "env") {
      apiKey = settings.envKey || "";
    }

    if (!apiKey || apiKey.trim() === "") {
      return NextResponse.json(
        { error: `${settings.displayName} API key is required. Please set up your API Key in the settings gear or server configuration.` },
        { status: 400 }
      );
    }

    const llmClient = createLLMClient(apiKey, provider);
    // --- END PROVIDER & API KEY RESOLUTION ---

    const engine = new InterviewEngine(llmClient);

    const turnResult = await engine.runTurn({
      state: conversation.interview_state,
      messages: updatedMessages,
    });

    await saveConversationTurn(
      projectId,
      turnResult.updatedMessages,
      turnResult.updatedState
    );

    return NextResponse.json({
      nextQuestion: turnResult.nextQuestion,
      state: turnResult.updatedState,
      messages: turnResult.updatedMessages,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: message || "An error occurred while calling the Anthropic API." },
      { status: 500 }
    );
  }
}