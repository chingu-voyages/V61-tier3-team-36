import Link from "next/link";
import Card from "../ui/Card";

type ProjectCardProps = {
  project: {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
  };
};

export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Card className="hover:shadow-xl transition-all duration-200">
      <div className="flex flex-col gap-4">

        <div>
          <h2 className="text-2xl font-bold">
            📁 {project.name}
          </h2>

          <p className="mt-2 text-gray-600">
            {project.description || "No description available"}
          </p>
        </div>

        <div className="flex items-center justify-between">

          <span className="text-sm text-gray-500">
            Created {project.createdAt.toLocaleDateString()}
          </span>

          <Link
            href={`/project/${project.id}/overview`}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
          >
            Open →
          </Link>

        </div>

      </div>
    </Card>
  );
}