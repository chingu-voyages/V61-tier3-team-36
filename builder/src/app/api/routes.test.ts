import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as createWorkspaceRoute } from "./workspaces/route";
import {
  GET as listProjectsRoute,
  POST as createProjectRoute,
} from "./projects/route";
import {
  DELETE as deleteProjectRoute,
  PATCH as renameProjectRoute,
} from "./projects/[projectId]/route";
import { POST as chatRoute } from "./chat/route";
import { GET as getSpecRoute, POST as generateSpecRoute } from "./spec/route";
import { SPEC_SECTIONS } from "../../../lib/spec-sections";

const repository = vi.hoisted(() => ({
  createWorkspace: vi.fn(),
  getWorkspaceByMagicToken: vi.fn(),
  getProjectInWorkspace: vi.fn(),
  createProject: vi.fn(),
  listProjects: vi.fn(),
  renameProject: vi.fn(),
  deleteProject: vi.fn(),
  getOrCreateConversation: vi.fn(),
  saveConversationTurn: vi.fn(),
  createLLMClient: vi.fn((apiKey: string) => ({ apiKey })),
  runTurn: vi.fn(),
  InterviewEngine: vi.fn(),
  generateSpec: vi.fn(),
  createSpecVersion: vi.fn(),
  getLatestSpec: vi.fn(),
}));

vi.mock("../../../lib/workspace", () => ({
  createWorkspace: repository.createWorkspace,
  getWorkspaceByMagicToken: repository.getWorkspaceByMagicToken,
}));

vi.mock("../../../lib/project", () => ({
  getProjectInWorkspace: repository.getProjectInWorkspace,
  createProject: repository.createProject,
  listProjects: repository.listProjects,
  renameProject: repository.renameProject,
  deleteProject: repository.deleteProject,
}));

vi.mock("../../../lib/conversation", () => ({
  getOrCreateConversation: repository.getOrCreateConversation,
  saveConversationTurn: repository.saveConversationTurn,
}));

vi.mock("../../../lib/llm-client", () => ({
  createLLMClient: repository.createLLMClient,
}));

vi.mock("../../../lib/interview-engine", () => ({
  InterviewEngine: repository.InterviewEngine,
}));

vi.mock("../../../lib/spec-generator", () => ({
  generateSpec: repository.generateSpec,
}));

vi.mock("../../../lib/spec", () => ({
  createSpecVersion: repository.createSpecVersion,
  getLatestSpec: repository.getLatestSpec,
}));

const workspace = {
  id: "workspace-1",
  magic_token: "token-1",
  created_at: new Date("2026-01-01T00:00:00.000Z"),
};

const project = {
  id: "project-1",
  workspace_id: "workspace-1",
  name: "Project One",
  status: "active",
  created_at: new Date("2026-01-02T00:00:00.000Z"),
};

const convergedState = {
  satisfiedSectionIds: SPEC_SECTIONS.map((section) => section.id),
};

function request(
  method: string,
  path: string,
  options: {
    token?: string;
    aiKey?: string;
    body?: unknown;
    rawBody?: string;
  } = {}
function request(
  method: string,
  path: string,
  options: { token?: string; body?: unknown } = {}
) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: {
      ...(options.token ? { "X-Workspace-Token": options.token } : {}),
      ...(options.aiKey ? { "X-AI-Model-Key": options.aiKey } : {}),
      ...(options.body || options.rawBody
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body: options.rawBody ?? (options.body ? JSON.stringify(options.body) : undefined),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

function projectContext(projectId = "project-1") {
  return { params: Promise.resolve({ projectId }) };
}

describe("workspace routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("creates a workspace and returns only its magic token", async () => {
    repository.createWorkspace.mockResolvedValue(workspace);

    const response = await createWorkspaceRoute();

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ magicToken: "token-1" });
  });
});

describe("project routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    repository.InterviewEngine.mockImplementation(() => ({
      runTurn: repository.runTurn,
    }));
  });

  it("returns 400 when the workspace token is missing", async () => {
    const response = await listProjectsRoute(request("GET", "/api/projects"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Workspace token is required",
    });
    expect(repository.getWorkspaceByMagicToken).not.toHaveBeenCalled();
  });

  it("returns 404 when the workspace token is unknown", async () => {
    repository.getWorkspaceByMagicToken.mockResolvedValue(undefined);

    const response = await listProjectsRoute(
      request("GET", "/api/projects", { token: "unknown" })
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Workspace not found",
    });
    expect(repository.listProjects).not.toHaveBeenCalled();
  });

  it("lists projects for the authenticated workspace", async () => {
    repository.getWorkspaceByMagicToken.mockResolvedValue(workspace);
    repository.listProjects.mockResolvedValue([project]);

    const response = await listProjectsRoute(
      request("GET", "/api/projects", { token: "token-1" })
    );

    expect(response.status).toBe(200);
    expect(repository.listProjects).toHaveBeenCalledWith("workspace-1");
    await expect(response.json()).resolves.toMatchObject([
      { id: "project-1", workspace_id: "workspace-1" },
    ]);
  });

  it("creates a project for the authenticated workspace", async () => {
    repository.getWorkspaceByMagicToken.mockResolvedValue(workspace);
    repository.createProject.mockResolvedValue(project);

    const response = await createProjectRoute(
      request("POST", "/api/projects", {
        token: "token-1",
        body: { name: "Project One" },
      })
    );

    expect(response.status).toBe(201);
    expect(repository.createProject).toHaveBeenCalledWith(
      "workspace-1",
      "Project One"
    );
    await expect(response.json()).resolves.toMatchObject({
      id: "project-1",
      name: "Project One",
    });
  });

  it("returns 400 when creating a project without a name", async () => {
    repository.getWorkspaceByMagicToken.mockResolvedValue(workspace);

    const response = await createProjectRoute(
      request("POST", "/api/projects", {
        token: "token-1",
        body: { name: " " },
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Project name is required",
    });
    expect(repository.createProject).not.toHaveBeenCalled();
  });

  it("renames a project in the authenticated workspace", async () => {
    const renamedProject = { ...project, name: "New Name" };
    repository.getWorkspaceByMagicToken.mockResolvedValue(workspace);
    repository.renameProject.mockResolvedValue(renamedProject);

    const response = await renameProjectRoute(
      request("PATCH", "/api/projects/project-1", {
        token: "token-1",
        body: { name: "New Name" },
      }),
      projectContext()
    );

    expect(response.status).toBe(200);
    expect(repository.renameProject).toHaveBeenCalledWith(
      "workspace-1",
      "project-1",
      "New Name"
    );
    await expect(response.json()).resolves.toMatchObject({ name: "New Name" });
  });

  it("returns 404 when renaming a project outside the workspace", async () => {
    repository.getWorkspaceByMagicToken.mockResolvedValue(workspace);
    repository.renameProject.mockResolvedValue(null);

    const response = await renameProjectRoute(
      request("PATCH", "/api/projects/project-2", {
        token: "token-1",
        body: { name: "New Name" },
      }),
      projectContext("project-2")
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Project not found",
    });
  });

  it("deletes a project in the authenticated workspace", async () => {
    repository.getWorkspaceByMagicToken.mockResolvedValue(workspace);
    repository.deleteProject.mockResolvedValue(true);

    const response = await deleteProjectRoute(
      request("DELETE", "/api/projects/project-1", { token: "token-1" }),
      projectContext()
    );

    expect(response.status).toBe(204);
    expect(repository.deleteProject).toHaveBeenCalledWith(
      "workspace-1",
      "project-1"
    );
  });

  it("returns 404 when deleting a project outside the workspace", async () => {
    repository.getWorkspaceByMagicToken.mockResolvedValue(workspace);
    repository.deleteProject.mockResolvedValue(false);

    const response = await deleteProjectRoute(
      request("DELETE", "/api/projects/project-2", { token: "token-1" }),
      projectContext("project-2")
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Project not found",
    });
  });
});

describe("chat route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    repository.createLLMClient.mockImplementation((apiKey: string) => ({
      apiKey,
    }));
    repository.InterviewEngine.mockImplementation(() => ({
      runTurn: repository.runTurn,
    }));
  });

  it("returns 401 when the AI model API key header is missing", async () => {
    const response = await chatRoute(
      request("POST", "/api/chat", {
        token: "token-1",
        body: { projectId: "project-1", message: "I want a planning app." },
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "AI model API key is required",
    });
    expect(repository.getWorkspaceByMagicToken).not.toHaveBeenCalled();
  });

  it("runs one interview turn, persists the completed result, and returns the next question", async () => {
    const initialMessages = [
      { role: "assistant" as const, content: "What are you building?" },
    ];
    const updatedState = { satisfiedSectionIds: ["problem"] };
    const updatedMessages = [
      ...initialMessages,
      { role: "user" as const, content: "A planning app." },
      {
        role: "assistant" as const,
        content: [
          {
            type: "tool_use" as const,
            id: "tool-1",
            name: "update_interview",
            input: {
              satisfied_section_ids: ["problem"],
              next_question: "Who is this for?",
            },
          },
        ],
      },
    ];

    repository.getWorkspaceByMagicToken.mockResolvedValue(workspace);
    repository.getProjectInWorkspace.mockResolvedValue(project);
    repository.getOrCreateConversation.mockResolvedValue({
      id: "conversation-1",
      project_id: "project-1",
      messages: initialMessages,
      interview_state: { satisfiedSectionIds: [] },
    });
    repository.runTurn.mockResolvedValue({
      nextQuestion: "Who is this for?",
      updatedState,
      updatedMessages,
    });

    const response = await chatRoute(
      request("POST", "/api/chat", {
        token: "token-1",
        aiKey: "model-key",
        body: { projectId: "project-1", message: "A planning app." },
      })
    );

    expect(response.status).toBe(200);
    expect(repository.createLLMClient).toHaveBeenCalledWith("model-key");
    expect(repository.getProjectInWorkspace).toHaveBeenCalledWith(
      "workspace-1",
      "project-1"
    );
    expect(repository.runTurn).toHaveBeenCalledWith({
      state: { satisfiedSectionIds: [] },
      messages: [
        ...initialMessages,
        { role: "user", content: "A planning app." },
      ],
    });
    expect(repository.saveConversationTurn).toHaveBeenCalledWith(
      "project-1",
      updatedMessages,
      updatedState
    );
    await expect(response.json()).resolves.toEqual({
      nextQuestion: "Who is this for?",
      converged: false,
    });
  });

  it("returns 502 and leaves the conversation unsaved when the model turn fails", async () => {
    repository.getWorkspaceByMagicToken.mockResolvedValue(workspace);
    repository.getProjectInWorkspace.mockResolvedValue(project);
    repository.getOrCreateConversation.mockResolvedValue({
      id: "conversation-1",
      project_id: "project-1",
      messages: [],
      interview_state: { satisfiedSectionIds: [] },
    });
    repository.runTurn.mockRejectedValue(new Error("tool call missing"));

    const response = await chatRoute(
      request("POST", "/api/chat", {
        token: "token-1",
        aiKey: "model-key",
        body: { projectId: "project-1", message: "A planning app." },
      })
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error:
        "Interview turn failed while calling the AI model. Check your API key and try again.",
    });
    expect(repository.saveConversationTurn).not.toHaveBeenCalled();
  });

  it("returns 404 without loading a conversation when the project is outside the workspace", async () => {
    repository.getWorkspaceByMagicToken.mockResolvedValue(workspace);
    repository.getProjectInWorkspace.mockResolvedValue(null);

    const response = await chatRoute(
      request("POST", "/api/chat", {
        token: "token-1",
        aiKey: "model-key",
        body: { projectId: "project-2", message: "A planning app." },
      })
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Project not found",
    });
    expect(repository.getOrCreateConversation).not.toHaveBeenCalled();
  });
});

describe("spec route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    repository.createLLMClient.mockImplementation((apiKey: string) => ({
      apiKey,
    }));
  });

  it("returns 401 when generating without an AI model API key", async () => {
    const response = await generateSpecRoute(
      request("POST", "/api/spec", {
        token: "token-1",
        body: { projectId: "project-1" },
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "AI model API key is required",
    });
    expect(repository.getWorkspaceByMagicToken).not.toHaveBeenCalled();
  });

  it("returns 400 when the workspace token is missing", async () => {
    const response = await generateSpecRoute(
      request("POST", "/api/spec", {
        aiKey: "model-key",
        body: { projectId: "project-1" },
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Workspace token is required",
    });
  });

  it("returns 404 when the workspace token is unknown", async () => {
    repository.getWorkspaceByMagicToken.mockResolvedValue(undefined);

    const response = await generateSpecRoute(
      request("POST", "/api/spec", {
        token: "unknown",
        aiKey: "model-key",
        body: { projectId: "project-1" },
      })
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Workspace not found",
    });
  });

  it("returns 400 for invalid JSON", async () => {
    repository.getWorkspaceByMagicToken.mockResolvedValue(workspace);

    const response = await generateSpecRoute(
      request("POST", "/api/spec", {
        token: "token-1",
        aiKey: "model-key",
        rawBody: "{",
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid JSON payload",
    });
  });

  it("returns 400 when projectId is missing", async () => {
    repository.getWorkspaceByMagicToken.mockResolvedValue(workspace);

    const response = await generateSpecRoute(
      request("POST", "/api/spec", {
        token: "token-1",
        aiKey: "model-key",
        body: {},
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Project id is required",
    });
  });

  it("returns 404 when the project is outside the workspace", async () => {
    repository.getWorkspaceByMagicToken.mockResolvedValue(workspace);
    repository.getProjectInWorkspace.mockResolvedValue(null);

    const response = await generateSpecRoute(
      request("POST", "/api/spec", {
        token: "token-1",
        aiKey: "model-key",
        body: { projectId: "project-2" },
      })
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Project not found",
    });
    expect(repository.getOrCreateConversation).not.toHaveBeenCalled();
  });

  it("returns 400 when the interview is not converged", async () => {
    repository.getWorkspaceByMagicToken.mockResolvedValue(workspace);
    repository.getProjectInWorkspace.mockResolvedValue(project);
    repository.getOrCreateConversation.mockResolvedValue({
      id: "conversation-1",
      project_id: "project-1",
      messages: [],
      interview_state: { satisfiedSectionIds: [] },
    });

    const response = await generateSpecRoute(
      request("POST", "/api/spec", {
        token: "token-1",
        aiKey: "model-key",
        body: { projectId: "project-1" },
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Interview must be converged before generating a spec",
    });
    expect(repository.generateSpec).not.toHaveBeenCalled();
  });

  it("generates a spec, saves a new version, and returns markdown plus version", async () => {
    const messages = [{ role: "user" as const, content: "Build a spec app." }];
    const generated = {
      markdown: "# Project Spec",
      sections: { "problem-goal": "Help developers write specs." },
    };
    const savedSpec = {
      id: "spec-2",
      project_id: "project-1",
      markdown: "# Project Spec",
      schema_json: generated.sections,
      version: 2,
      created_at: new Date("2026-01-03T00:00:00.000Z"),
    };

    repository.getWorkspaceByMagicToken.mockResolvedValue(workspace);
    repository.getProjectInWorkspace.mockResolvedValue(project);
    repository.getOrCreateConversation.mockResolvedValue({
      id: "conversation-1",
      project_id: "project-1",
      messages,
      interview_state: convergedState,
    });
    repository.generateSpec.mockResolvedValue(generated);
    repository.createSpecVersion.mockResolvedValue(savedSpec);

    const response = await generateSpecRoute(
      request("POST", "/api/spec", {
        token: "token-1",
        aiKey: "model-key",
        body: { projectId: "project-1" },
      })
    );

    expect(response.status).toBe(201);
    expect(repository.createLLMClient).toHaveBeenCalledWith("model-key");
    expect(repository.generateSpec).toHaveBeenCalledWith(
      { apiKey: "model-key" },
      messages
    );
    expect(repository.createSpecVersion).toHaveBeenCalledWith(
      "project-1",
      "# Project Spec",
      generated.sections
    );
    await expect(response.json()).resolves.toEqual({
      markdown: "# Project Spec",
      version: 2,
    });
  });

  it("returns 502 and does not create a spec version when generation fails", async () => {
    repository.getWorkspaceByMagicToken.mockResolvedValue(workspace);
    repository.getProjectInWorkspace.mockResolvedValue(project);
    repository.getOrCreateConversation.mockResolvedValue({
      id: "conversation-1",
      project_id: "project-1",
      messages: [{ role: "user", content: "Build a spec app." }],
      interview_state: convergedState,
    });
    repository.generateSpec.mockRejectedValue(new Error("tool failure"));

    const response = await generateSpecRoute(
      request("POST", "/api/spec", {
        token: "token-1",
        aiKey: "model-key",
        body: { projectId: "project-1" },
      })
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error:
        "Specification generation failed while calling the AI model. Check your API key and try again.",
    });
    expect(repository.createSpecVersion).not.toHaveBeenCalled();
    expect(repository.saveConversationTurn).not.toHaveBeenCalled();
  });

  it("returns the latest spec", async () => {
    repository.getWorkspaceByMagicToken.mockResolvedValue(workspace);
    repository.getProjectInWorkspace.mockResolvedValue(project);
    repository.getLatestSpec.mockResolvedValue({
      id: "spec-2",
      project_id: "project-1",
      markdown: "# Latest Spec",
      schema_json: {},
      version: 2,
      created_at: new Date("2026-01-03T00:00:00.000Z"),
    });

    const response = await getSpecRoute(
      request("GET", "/api/spec?projectId=project-1", { token: "token-1" })
    );

    expect(response.status).toBe(200);
    expect(repository.getLatestSpec).toHaveBeenCalledWith("project-1");
    await expect(response.json()).resolves.toEqual({
      markdown: "# Latest Spec",
      version: 2,
    });
  });

  it("returns 404 when no spec exists for the project", async () => {
    repository.getWorkspaceByMagicToken.mockResolvedValue(workspace);
    repository.getProjectInWorkspace.mockResolvedValue(project);
    repository.getLatestSpec.mockResolvedValue(null);

    const response = await getSpecRoute(
      request("GET", "/api/spec?projectId=project-1", { token: "token-1" })
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Specification not found",
    });
  });
});
