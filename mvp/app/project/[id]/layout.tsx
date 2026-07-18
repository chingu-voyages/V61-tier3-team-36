import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: {
      id,
      
    },
  });
  console.log("Session User:", session.user.id);
  console.log("Project:", project);
  if (!project) {
    return <div>Project not found in database</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-white">

      {/* Header */}

      <header className="border-b border-zinc-800 px-8 py-6">
        <Link
          href="/dashboard"
          className="text-sm text-blue-400 hover:underline"
        >
          ← Back to Dashboard
        </Link>

        <h1 className="mt-4 text-3xl font-bold">
          {project.name}
        </h1>

        <p className="mt-2 text-zinc-400">
          {project.description || "No description provided."}
        </p>

        {project.deadline && (
          <p className="mt-2 text-sm text-zinc-500">
            Deadline:{" "}
            {project.deadline.toLocaleDateString()}
          </p>
        )}
      </header>

      {/* Workspace */}

      <div className="flex flex-1">

        {/* Sidebar */}

        <aside className="w-72 border-r border-zinc-800 bg-zinc-900 p-6">

          <nav className="space-y-3">

            <Link
              href={`/project/${id}/overview`}
              className="block rounded-lg px-3 py-2 hover:bg-zinc-800"
            >
              Overview
            </Link>

            <Link
              href={`/project/${id}/problem`}
              className="block rounded-lg px-3 py-2 hover:bg-zinc-800"
            >
              Problem Statement
            </Link>

            <Link
              href={`/project/${id}/requirements`}
              className="block rounded-lg px-3 py-2 hover:bg-zinc-800"
            >
              Requirements
            </Link>

            <Link
              href={`/project/${id}/srs`}
              className="block rounded-lg px-3 py-2 hover:bg-zinc-800"
            >
              SRS
            </Link>

          </nav>

        </aside>

        {/* Page */}

        <main className="flex-1 p-10">
          {children}
        </main>

      </div>

    </div>
  );
}