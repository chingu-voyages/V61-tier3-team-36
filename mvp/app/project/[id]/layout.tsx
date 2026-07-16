import Link from "next/link";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r p-6 bg-gray-50">
        <h1 className="text-2xl font-bold mb-8">
          FlowSpec
        </h1>

        <nav className="space-y-4">
          <Link href={`/project/${id}/overview`} className="block hover:text-blue-600">
             Overview
          </Link>

          <Link href={`/project/${id}/problem`} className="block hover:text-blue-600" >
             Problem Statement
          </Link>

          <Link href={`/project/${id}/requirements`} className="block hover:text-blue-600" >
             Requirements
          </Link>

          <Link href={`/project/${id}/srs`} className="block hover:text-blue-600">
             SRS
          </Link>
        </nav>
      </aside>

      <main className="flex-1 p-10">
        {children}
      </main>
    </div>
  );
}