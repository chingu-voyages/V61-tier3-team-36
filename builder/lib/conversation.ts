import type Anthropic from "@anthropic-ai/sdk";
import sql from "./db";
import {
  createInterviewState,
  type InterviewState,
} from "./interview-state";

export type ConversationMessage = Anthropic.MessageParam;

export interface Conversation {
  id: string;
  project_id: string;
  messages: ConversationMessage[];
  interview_state: InterviewState;
}

type JsonValue = unknown;

type ConversationDb = {
  begin<T>(callback: (tx: ConversationDb) => Promise<T>): Promise<T>;
  json(value: JsonValue): JsonValue;
} & (<T>(
  strings: TemplateStringsArray,
  ...values: JsonValue[]
) => Promise<T>);

const defaultDb = sql as unknown as ConversationDb;

function toConversation(row: Conversation): Conversation {
  return {
    ...row,
    messages: row.messages ?? [],
    interview_state: row.interview_state ?? createInterviewState(),
  };
}

/**
 * Returns the project's single conversation, creating it on first access.
 */
export async function getOrCreateConversation(
  projectId: string,
  db: ConversationDb = defaultDb
): Promise<Conversation> {
  return db.begin(async (tx) => {
    const initialState = createInterviewState();

    const [created] = await tx<Conversation[]>`
      INSERT INTO conversation (project_id, messages, interview_state)
      VALUES (${projectId}, ${db.json([])}, ${db.json(initialState)})
      ON CONFLICT (project_id) DO NOTHING
      RETURNING id, project_id, messages, interview_state
    `;

    if (created) {
      return toConversation(created);
    }

    const [conversation] = await tx<Conversation[]>`
      SELECT id, project_id, messages, interview_state
      FROM conversation
      WHERE project_id = ${projectId}
    `;

    return toConversation(conversation);
  });
}

/**
 * Persists a completed interview turn in one atomic write.
 *
 * Call this only after the engine has successfully produced both updated
 * messages and state; failed or dropped turns should never reach this boundary.
 */
export async function saveConversationTurn(
  projectId: string,
  messages: readonly ConversationMessage[],
  interviewState: InterviewState,
  db: ConversationDb = defaultDb
): Promise<Conversation> {
  return db.begin(async (tx) => {
    const [conversation] = await tx<Conversation[]>`
      INSERT INTO conversation (project_id, messages, interview_state)
      VALUES (${projectId}, ${db.json([...messages])}, ${db.json(interviewState)})
      ON CONFLICT (project_id) DO UPDATE
        SET messages = EXCLUDED.messages,
            interview_state = EXCLUDED.interview_state
      RETURNING id, project_id, messages, interview_state
    `;

    return toConversation(conversation);
  });
}
