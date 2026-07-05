import { redirect } from "next/navigation";
import { createWorkspace } from "../../lib/workspace";

export default async function Home() {
  const workspace = await createWorkspace();
  redirect(`/workspace/${workspace.magic_token}`);
}
