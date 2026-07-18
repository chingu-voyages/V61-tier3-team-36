import { prisma } from "@/lib/prisma";
import NewRequirementButton from "./NewRequirementButton";
import RequirementCard from "./RequirementCard";

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
            <RequirementCard
              key={req.id}
              requirement={req}
            />
          ))}
        </div>
      )}
    </div>
  );
}