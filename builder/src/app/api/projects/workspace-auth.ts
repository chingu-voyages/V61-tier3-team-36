import { NextResponse } from "next/server";
import {
  getWorkspaceByMagicToken,
  type Workspace,
} from "../../../../lib/workspace";

export type WorkspaceAuthResult =
  | { workspace: Workspace; response?: never }
  | { workspace?: never; response: NextResponse };

export async function authenticateWorkspace(
  request: Request
): Promise<WorkspaceAuthResult> {
  const token = request.headers.get("X-Workspace-Token");

  if (!token) {
    return {
      response: NextResponse.json(
        { error: "Workspace token is required" },
        { status: 400 }
      ),
    };
  }

  const workspace = await getWorkspaceByMagicToken(token);

  if (!workspace) {
    return {
      response: NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      ),
    };
  }

  return { workspace };
}
