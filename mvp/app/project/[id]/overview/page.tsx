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
    include: {
      requirements: true,
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

  const totalRequirements = project.requirements.length;

  const completedRequirements = project.requirements.filter(
    (r) => r.status === "DONE"
  ).length;

  const inProgressRequirements = project.requirements.filter(
    (r) => r.status === "IN_PROGRESS"
  ).length;

  const todoRequirements = project.requirements.filter(
    (r) => r.status === "TODO"
  ).length;

  const completionPercentage =
    totalRequirements === 0
      ? 0
      : Math.round(
          (completedRequirements / totalRequirements) * 100
        );

  return (
    <main className="p-10 space-y-10">
      <div>
        <h1 className="text-4xl font-bold">
          {project.name}
        </h1>

        <p className="mt-3 text-zinc-400">
          {project.description || "No description provided."}
        </p>

        <p className="mt-3">
          Deadline:{" "}
          {project.deadline
            ? project.deadline.toLocaleDateString()
            : "No deadline"}
        </p>

        <p className="mt-2 text-zinc-500">
          Created: {project.createdAt.toLocaleDateString()}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="rounded-xl border border-zinc-700 p-6">
          <p className="text-zinc-400">Requirements</p>
          <h2 className="mt-2 text-3xl font-bold">
            {totalRequirements}
          </h2>
        </div>

        <div className="rounded-xl border border-zinc-700 p-6">
          <p className="text-zinc-400">Completed</p>
          <h2 className="mt-2 text-3xl font-bold text-green-400">
            {completedRequirements}
          </h2>
        </div>

        <div className="rounded-xl border border-zinc-700 p-6">
          <p className="text-zinc-400">In Progress</p>
          <h2 className="mt-2 text-3xl font-bold text-blue-400">
            {inProgressRequirements}
          </h2>
        </div>

        <div className="rounded-xl border border-zinc-700 p-6">
          <p className="text-zinc-400">Todo</p>
          <h2 className="mt-2 text-3xl font-bold text-orange-400">
            {todoRequirements}
          </h2>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-700 p-6">
        <div className="mb-3 flex justify-between">
          <span className="font-medium">
            Project Progress
          </span>

          <span>{completionPercentage}%</span>
        </div>

        <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full bg-blue-600 transition-all"
            style={{
              width: `${completionPercentage}%`,
            }}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-700 p-6">
          <h3 className="text-xl font-semibold">
            Problem Statement
          </h3>

          <p className="mt-4 text-lg">
            {project.problemStatement
              ? "✅ Added"
              : "⚠ Not Added"}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-700 p-6">
          <h3 className="text-xl font-semibold">
            Business Goals
          </h3>

          <p className="mt-4 text-lg">
            {project.businessGoals
              ? "✅ Added"
              : "⚠ Not Added"}
          </p>
        </div>
      </div>
    </main>
  );
}