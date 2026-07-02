import { describe, expect, it } from "vitest";
import type { InterviewState } from "./interview-state";
import {
  getOrCreateConversation,
  saveConversationTurn,
  type Conversation,
  type ConversationMessage,
} from "./conversation";

type JsonValue = unknown;

type FakeDb = {
  begin<T>(callback: (tx: FakeDb) => Promise<T>): Promise<T>;
  json(value: JsonValue): JsonValue;
} & (<T>(strings: TemplateStringsArray, ...values: JsonValue[]) => Promise<T>);

function createFakeDb() {
  const conversations = new Map<string, Conversation>();
  const writes: string[] = [];

  const db = (async <T>(
    strings: TemplateStringsArray,
    ...values: JsonValue[]
  ): Promise<T> => {
    const query = strings.join(" ");
    const projectId = values[0] as string;
    writes.push(query);

    if (query.includes("INSERT INTO conversation")) {
      const messages = values[1] as ConversationMessage[];
      const interviewState = values[2] as InterviewState;
      const existing = conversations.get(projectId);

      if (existing && query.includes("SET messages = EXCLUDED.messages")) {
        existing.messages = messages;
        existing.interview_state = interviewState;
        return [existing] as T;
      }

      if (existing) {
        return [] as T;
      }

      const conversation: Conversation = {
        id: `conversation-${conversations.size + 1}`,
        project_id: projectId,
        messages,
        interview_state: interviewState,
      };
      conversations.set(projectId, conversation);
      return [conversation] as T;
    }

    if (query.includes("SELECT id, project_id, messages, interview_state")) {
      return [conversations.get(projectId)] as T;
    }

    throw new Error(`Unexpected query: ${query}`);
  }) as FakeDb;

  db.begin = async <T>(callback: (tx: FakeDb) => Promise<T>) => callback(db);
  db.json = (value: JsonValue) => value;

  return { db, conversations, writes };
}

describe("conversation repository", () => {
  it("creates one conversation on first access with empty messages and fresh state", async () => {
    const { db, conversations } = createFakeDb();

    const first = await getOrCreateConversation("project-1", db);
    const second = await getOrCreateConversation("project-1", db);

    expect(conversations.size).toBe(1);
    expect(second.id).toBe(first.id);
    expect(first.messages).toEqual([]);
    expect(first.interview_state).toEqual({ satisfiedSectionIds: [] });
  });

  it("saves messages and interview state together in one atomic write", async () => {
    const { db, writes } = createFakeDb();
    const messages: ConversationMessage[] = [
      { role: "user", content: "I need a recipe app." },
    ];
    const state: InterviewState = { satisfiedSectionIds: ["problem"] };

    const conversation = await saveConversationTurn("project-1", messages, state, db);

    expect(conversation.messages).toEqual(messages);
    expect(conversation.interview_state).toEqual(state);
    expect(writes).toHaveLength(1);
    expect(writes[0]).toContain("SET messages = EXCLUDED.messages");
    expect(writes[0]).toContain("interview_state = EXCLUDED.interview_state");
  });
});
