import { NextResponse } from "next/server";
import { createWorkspace } from "../../../../lib/workspace";

export async function POST() {
  const workspace = await createWorkspace();

  return NextResponse.json(
    { magicToken: workspace.magic_token },
    { status: 201 }
  );
}
