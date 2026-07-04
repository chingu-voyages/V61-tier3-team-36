import Anthropic from "@anthropic-ai/sdk";
import { LLMClient } from "./llm-client";
import { 
  InterviewState, 
  markSectionsSatisfied, 
  isConverged 
} from "./interview-state";
import { SPEC_SECTIONS } from "./spec-sections";

// Define the tool schema for forced tool-use
const UPDATE_INTERVIEW_TOOL: Anthropic.Tool = {
  name: "update_interview",
  description:
    "Updates the interview state with newly satisfied sections and provides the next question to ask the user.",
  input_schema: {
    type: "object",
    properties: {
      satisfied_section_ids: {
        type: "array",
        items: { type: "string" },
        description:
          "List of section IDs that have been fully satisfied by the user's answers so far.",
      },
      next_question: {
        type: "string",
        description: "The single next question to ask the user.",
      },
    },
    required: ["satisfied_section_ids", "next_question"],
  },
};

export interface TurnInput {
  state: InterviewState;
  messages: Anthropic.MessageParam[];
}

export interface TurnResult {
  nextQuestion: string;
  updatedState: InterviewState;
  updatedMessages: Anthropic.MessageParam[];
}

export class InterviewEngine {
  private client: LLMClient;

  constructor(client: LLMClient) {
    this.client = client;
  }

  private buildSystemPrompt(unsatisfiedSections: typeof SPEC_SECTIONS): string {
    const unsatisfiedList = unsatisfiedSections
      .map((s) => `- ${s.label} (id: ${s.id})`)
      .join("\n");

    return `You are an expert interviewer. Your goal is to gather information to satisfy the following required sections:

Unsatisfied sections:
${unsatisfiedList}

Instructions:
- Ask exactly ONE question at a time.
- Do not ask multiple questions in a single turn.
- You MUST use the 'update_interview' tool to provide your response.
- In the tool, list any section IDs from the unsatisfied list that have been fully satisfied by the user's answers so far.
- Provide the single next question in the 'next_question' field.`;
  }

  async runTurn(input: TurnInput): Promise<TurnResult> {
    if (isConverged(input.state)) {
      throw new Error("Interview is already converged. All sections are satisfied.");
    }

    const unsatisfiedSections = SPEC_SECTIONS.filter(
      (s) => !input.state.satisfiedSectionIds.includes(s.id)
    );

    const systemPrompt = this.buildSystemPrompt(unsatisfiedSections);

    const response = await this.client.createMessage({
      systemPrompt,
      messages: input.messages,
      tools: [UPDATE_INTERVIEW_TOOL],
      toolChoice: { type: "tool", name: "update_interview" },
    });

    // Parse response for the forced tool_use block
    const toolUseBlock = response.content.find(
      (block): block is Anthropic.ToolUseBlock =>
        block.type === "tool_use" && block.name === "update_interview"
    );

    if (!toolUseBlock) {
      throw new Error(
        "Model failed to return the structured tool call 'update_interview'."
      );
    }

    const toolInput = toolUseBlock.input as {
      satisfied_section_ids?: string[];
      next_question?: string;
    };

    if (
      !toolInput.next_question ||
      !Array.isArray(toolInput.satisfied_section_ids)
    ) {
      throw new Error(
        "Model returned malformed tool input. Expected 'satisfied_section_ids' and 'next_question'."
      );
    }

    // Merge newly satisfied sections with existing ones using the helper
    const updatedState = markSectionsSatisfied(
      input.state,
      toolInput.satisfied_section_ids
    );

    // Build updated conversation history
    const updatedMessages: Anthropic.MessageParam[] = [
      ...input.messages,
      { role: "assistant", content: response.content },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: toolUseBlock.id,
            content: "Interview state updated successfully.",
          },
        ],
      },
    ];

    return {
      nextQuestion: toolInput.next_question,
      updatedState,
      updatedMessages,
    };
  }
}