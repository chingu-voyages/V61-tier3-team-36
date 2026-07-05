import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { authenticateWorkspace } from "../../workspace-auth";
import sql from "../../../../../../lib/db";
import { getOrCreateConversation } from "../../../../../../lib/conversation";

vi.mock("../../workspace-auth", () => ({
  authenticateWorkspace: vi.fn(),
}));

vi.mock("../../../../../../lib/db", () => ({
  default: vi.fn(),
}));

vi.mock("../../../../../../lib/conversation", () => ({
  getOrCreateConversation: vi.fn(),
  saveConversationTurn: vi.fn(),
}));

describe("Conversation Route Handler", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const workspace = { id: "workspace-1", magic_token: "token-1" };
  const mockContext = { params: Promise.resolve({ projectId: "project-1" }) };

  it("returns 404 if the project is not owned by the workspace", async () => {
    (authenticateWorkspace as any).mockResolvedValue({ workspace });
    (sql as any).mockResolvedValue([]); // Project not found

    const request = new Request("http://localhost/api/projects/project-1/conversation", {
      headers: { "X-Workspace-Token": "token-1" },
    });

    const response = await GET(request, mockContext);
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Project not found" });
  });

  it("returns the conversation if the project belongs to the workspace", async () => {
    (authenticateWorkspace as any).mockResolvedValue({ workspace });
    (sql as any).mockResolvedValue([{ id: "project-1", name: "Project One" }]);
    
    const mockConversation = {
      id: "convo-1",
      project_id: "project-1",
      messages: [],
      interview_state: { satisfiedSectionIds: [] },
    };
    (getOrCreateConversation as any).mockResolvedValue(mockConversation);

    const request = new Request("http://localhost/api/projects/project-1/conversation", {
      headers: { "X-Workspace-Token": "token-1" },
    });

    const response = await GET(request, mockContext);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(mockConversation);
  });
});
