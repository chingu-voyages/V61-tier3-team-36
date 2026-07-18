import { prisma } from "@/lib/prisma";
import NewRequirementButton from "./NewRequirementButton";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function RequirementsPage({ params }: Props) {
  const { id } = await params;

  const requirements = await prisma.requirement.findMany({
    where: {
      projectId: id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">Requirements</h1>

        <NewRequirementButton projectId={id} />
      </div>

      {requirements.length === 0 ? (
        <div className="border border-zinc-700 rounded-xl p-10 text-center">
          <h2 className="text-2xl font-semibold">
            No requirements yet
          </h2>

          <p className="text-zinc-400 mt-3">
            Add your first requirement to start building your project specification.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {requirements.map((req) => (
            <div
              key={req.id}
              className="border border-zinc-700 rounded-xl p-6"
            >
              <h2 className="text-2xl font-semibold">
                {req.title}
              </h2>

              <p className="mt-3 text-zinc-300">
                {req.description}
              </p>

              <div className="flex gap-4 mt-5 text-sm text-zinc-400">
                <span>Priority: {req.priority}</span>
                <span>Status: {req.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}