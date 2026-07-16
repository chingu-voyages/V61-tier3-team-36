import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function Overview({ params }: Props) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: {
      id,
    },
  });

  if (!project) {
    return (
      <main className="p-10">
        <h1 className="text-3xl font-bold">
          Project Not Found
        </h1>
      </main>
    );
  }

  return (
    <main className="p-10">
      <h1 className="text-4xl font-bold">
        {project.name}
      </h1>

      <p className="mt-4">
        {project.description}
      </p>

      <p className="mt-4">
        Deadline: {project.deadline?.toLocaleDateString()}
      </p>

      <p className="mt-4 text-gray-500">
        Created: {project.createdAt.toLocaleDateString()}
      </p>
    </main>
  );
}