import Link from "next/link";

const projects = [
  {
    id: 1,
    name: "Campus Event Hub",
    progress: 40,
  },
  {
    id: 2,
    name: "Hospital Management",
    progress: 70,
  },
];

export default function Dashboard() {
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

      <div className="mt-10 space-y-6">
        {projects.map((project) => (
          <div key={project.id} className="rounded-xl border p-6 shadow-sm">
            <h2 className="text-2xl font-semibold">
               {project.name}
            </h2>

            <p className="mt-2">
              Progress: {project.progress}%
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