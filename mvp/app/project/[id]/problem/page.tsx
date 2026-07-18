import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProblemForm from "./ProblemForm";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProblemPage({ params }: Props) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: {
      id,
    },
  });

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Problem Statement</h1>

        <p className="text-zinc-400 mt-2">
          Describe the problem your software solves and the business goals.
        </p>
      </div>

      <ProblemForm
        projectId={project.id}
        initialProblemStatement={project.problemStatement ?? ""}
        initialBusinessGoals={project.businessGoals ?? ""}
      />
    </div>
  );
}