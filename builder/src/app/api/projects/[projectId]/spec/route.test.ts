import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { authenticateWorkspace } from "../../workspace-auth";
import sql from "../../../../../../lib/db";
import { getLatestSpec, createSpecVersion } from "../../../../../../lib/spec";
import { getOrCreateConversation } from "../../../../../../lib/conversation";
import { isConverged } from "../../../../../../lib/interview-state";

vi.mock("../../workspace-auth", () => ({
  authenticateWorkspace: vi.fn(),
}));

vi.mock("../../../../../../lib/db", () => ({
  default: vi.fn(),
}));

vi.mock("../../../../../../lib/spec", () => ({
  getLatestSpec: vi.fn(),
  createSpecVersion: vi.fn(),
}));

vi.mock("../../../../../../lib/conversation", () => ({
  getOrCreateConversation: vi.fn(),
}));

vi.mock("../../../../../../lib/interview-state", () => ({
  isConverged: vi.fn(),
}));

describe("Spec Route Handler", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const workspace = { id: "workspace-1", magic_token: "token-1" };
  const mockContext = { params: Promise.resolve({ projectId: "project-1" }) };

  it("returns 404 if the project is not owned by the workspace on GET", async () => {
    (authenticateWorkspace as any).mockResolvedValue({ workspace });
    (sql as any).mockResolvedValue([]); // Project not found

    const request = new Request("http://localhost/api/projects/project-1/spec", {
      headers: { "X-Workspace-Token": "token-1" },
    });

    const response = await GET(request, mockContext);
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Project not found" });
  });

  it("returns the latest spec if project owned by the workspace", async () => {
    (authenticateWorkspace as any).mockResolvedValue({ workspace });
    (sql as any).mockResolvedValue([{ id: "project-1", name: "Project One" }]);
    
    const mockSpec = {
      id: "spec-1",
      project_id: "project-1",
      markdown: "# Test Spec",
      schema_json: {},
      version: 1,
    };
    (getLatestSpec as any).mockResolvedValue(mockSpec);

    const request = new Request("http://localhost/api/projects/project-1/spec", {
      headers: { "X-Workspace-Token": "token-1" },
    });

    const response = await GET(request, mockContext);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(mockSpec);
  });

  it("returns 400 on POST if the interview is not converged", async () => {
    (authenticateWorkspace as any).mockResolvedValue({ workspace });
    (sql as any).mockResolvedValue([{ id: "project-1", name: "Project One" }]);
    (getOrCreateConversation as any).mockResolvedValue({
      interview_state: { satisfiedSectionIds: [] },
    });
    (isConverged as any).mockReturnValue(false); // Not completed

    const request = new Request("http://localhost/api/projects/project-1/spec", {
      method: "POST",
      headers: { "X-Workspace-Token": "token-1" },
    });

    const response = await POST(request, mockContext);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Cannot generate specification. The interview conversation has not converged yet.",
    });
  });

  it("returns 400 on POST if Anthropic key is missing", async () => {
    (authenticateWorkspace as any).mockResolvedValue({ workspace });
    (sql as any).mockResolvedValue([{ id: "project-1", name: "Project One" }]);
    (getOrCreateConversation as any).mockResolvedValue({
      interview_state: { satisfiedSectionIds: [] },
    });
    (isConverged as any).mockReturnValue(true); // completed

    const oldKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const request = new Request("http://localhost/api/projects/project-1/spec", {
      method: "POST",
      headers: { "X-Workspace-Token": "token-1" },
    });

    const response = await POST(request, mockContext);

    process.env.ANTHROPIC_API_KEY = oldKey;

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Anthropic API key is required");
  });
});
