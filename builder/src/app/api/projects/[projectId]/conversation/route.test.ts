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

  it("returns 400 on POST if message is missing", async () => {
    (authenticateWorkspace as any).mockResolvedValue({ workspace });
    (sql as any).mockResolvedValue([{ id: "project-1", name: "Project One" }]);

    const request = new Request("http://localhost/api/projects/project-1/conversation", {
      method: "POST",
      headers: { "X-Workspace-Token": "token-1", "Content-Type": "application/json" },
      body: JSON.stringify({ message: " " }),
    });

    const response = await POST(request, mockContext);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Message is required" });
  });

  it("returns 400 on POST if Anthropic key is missing", async () => {
    (authenticateWorkspace as any).mockResolvedValue({ workspace });
    (sql as any).mockResolvedValue([{ id: "project-1", name: "Project One" }]);
    (getOrCreateConversation as any).mockResolvedValue({
      messages: [],
      interview_state: { satisfiedSectionIds: [] },
    });

    // Temporarily clear env variable for test isolation
    const oldKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const request = new Request("http://localhost/api/projects/project-1/conversation", {
      method: "POST",
      headers: {
        "X-Workspace-Token": "token-1",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message: "Intake concept" }),
    });

    const response = await POST(request, mockContext);
    
    // Restore env key
    process.env.ANTHROPIC_API_KEY = oldKey;

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Anthropic API key is required");
  });
});
