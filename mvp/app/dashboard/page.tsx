import Link from "next/link";
import { prisma } from "@/lib/prisma";


export default async function Dashboard() {
  const projects = await prisma.project.findMany({
  orderBy: {
    createdAt: "desc",
  },
});
  return (
    <main className="min-h-screen p-10">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold">
          Dashboard
        </h1>

        <Link href="/create-project" className="rounded-lg bg-black px-5 py-2 text-white hover:bg-gray-800">
          + New Project
        </Link>
      </div>
      
      {projects.length === 0 && (
      <p className="mt-10 text-gray-500">
        No projects yet.
      </p>
      )}
      
      <div className="mt-10 space-y-6">
        {projects.map((project) => (
          <div key={project.id} className="rounded-xl border p-6 shadow-sm">
            <h2 className="text-2xl font-semibold">
               {project.name}
            </h2>

            <p className="mt-2 text-gray-600">
                {project.description}
            </p>

            <Link href={`/project/${project.id}/overview`} className="mt-4 inline-block rounded bg-gray-200 px-4 py-2 hover:bg-gray-300">
              Open →
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}