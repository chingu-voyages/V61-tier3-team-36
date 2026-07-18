import sql from './db';

export interface Workspace {
  id: string;
  magic_token: string;
  created_at: Date;
}

/**
 * Create a new workspace with a cryptographically strong magic token.
 * Returns the created workspace row.
 */
export async function createWorkspace(): Promise<Workspace> {
  const [workspace] = await sql<Workspace[]>`
    INSERT INTO workspace 
    DEFAULT VALUES
    RETURNING id, magic_token, created_at
  `;
  return workspace;
}

/**
 * Fetch a workspace by its magic token.
 * Returns the workspace or undefined if not found.
 */
export async function getWorkspaceByMagicToken(
  magicToken: string
): Promise<Workspace | undefined> {

  console.log("Looking up:", magicToken);

  const result = await sql<Workspace[]>`
    SELECT id, magic_token, created_at
    FROM workspace
    WHERE magic_token = ${magicToken}
  `;

  console.log(result);

  return result[0];
}