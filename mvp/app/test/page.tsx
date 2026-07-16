import { prisma } from "@/lib/prisma";

export default async function TestPage() {
  const projects = await prisma.project.findMany();

  return (
    <main className="p-10">
      <h1 className="text-3xl font-bold">
        Database Test
      </h1>

      <pre className="mt-5">
        {JSON.stringify(projects, null, 2)}
      </pre>
    </main>
  );
}