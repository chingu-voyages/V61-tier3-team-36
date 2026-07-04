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

const repository = vi.hoisted(() => ({
  createWorkspace: vi.fn(),
  getWorkspaceByMagicToken: vi.fn(),
  createProject: vi.fn(),
  listProjects: vi.fn(),
  renameProject: vi.fn(),
  deleteProject: vi.fn(),
}));

vi.mock("../../../lib/workspace", () => ({
  createWorkspace: repository.createWorkspace,
  getWorkspaceByMagicToken: repository.getWorkspaceByMagicToken,
}));

vi.mock("../../../lib/project", () => ({
  createProject: repository.createProject,
  listProjects: repository.listProjects,
  renameProject: repository.renameProject,
  deleteProject: repository.deleteProject,
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

function request(
  method: string,
  path: string,
  options: { token?: string; body?: unknown } = {}
) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: {
      ...(options.token ? { "X-Workspace-Token": options.token } : {}),
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
