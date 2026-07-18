import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }
  const projects = await prisma.project.findMany({
  orderBy: {
    createdAt: "desc",
  },
  include: {
    requirements: true,
  },
});
  return (
    <main className="min-h-screen bg-zinc-950 p-10 text-white">
  <div className="mx-auto max-w-7xl">

    <div className="mb-10 flex items-center justify-between">
      <div>
        <h1 className="text-4xl font-bold">Dashboard</h1>
        <p className="mt-2 text-zinc-400">
          Manage all your software projects.
        </p>
      </div>

      <Link href="/create-project" className="rounded-xl bg-blue-600 px-5 py-3 font-medium transition hover:bg-blue-700">
        + New Project
      </Link>
    </div>

    {projects.length === 0 && (
      <div className="rounded-2xl border border-dashed border-zinc-700 py-24 text-center">
       <div className="text-6xl">📁</div>
        <h2 className="mt-6 text-2xl font-semibold">
          No Projects Yet
        </h2>

        <p className="mt-3 text-zinc-400">
          Create your first project to start planning software.
        </p>

      </div>
    )}

    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

      {projects.map((project) => {
        const total = project.requirements.length;
        return (
          <div key={project.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-blue-500 hover:shadow-xl">

            <div className="flex items-start justify-between">
              <div>

                <div className="mb-2 text-3xl">
                  
                </div>

                <h2 className="text-2xl font-bold">
                  {project.name}
                </h2>

              </div>

              <Link href={`/project/${project.id}/overview`} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium hover:bg-blue-700" >
                Open →
              </Link>

            </div>

            <p className="mt-4 line-clamp-2 text-zinc-400">
              {project.description || "No description provided."}
            </p>

            <div className="mt-6">

              <div className="mb-2 flex justify-between text-sm text-zinc-400">

                <span>
                  Requirements
                </span>

                <span>
                  {total}
                </span>

              </div>

              <div className="h-2 rounded-full bg-zinc-800">

                <div
                  className="h-2 w-0 rounded-full bg-blue-500"
                />

              </div>

            </div>

            <div className="mt-6 flex justify-between text-sm text-zinc-500">

              <span>
                Created
              </span>

              <span>
                {project.createdAt.toLocaleDateString()}
              </span>

            </div>

          </div>

        );
      })}

    </div>

  </div>
</main>
  );
}