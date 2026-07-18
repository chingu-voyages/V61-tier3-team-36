export default function SRSPage() {
  return (
    <main className="flex min-h-[80vh] items-center justify-center p-10">
      <div className="w-full max-w-4xl rounded-2xl border border-zinc-700 bg-zinc-900 p-10 shadow-xl">

        <div className="text-center">

          <div className="text-7xl"></div>
          <div className="mb-6 flex justify-center">
           <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1 text-sm font-medium text-amber-300">
            Under Development
           </span>
          </div>

          <h1 className="mt-6 text-4xl font-bold">
            Software Requirements Specification
          </h1>

          <p className="mt-4 text-lg text-zinc-400">
            Generate a complete Software Requirements Specification
            directly from your project data.
          </p>

        </div>

        <div className="mt-12 rounded-xl border border-zinc-700 bg-zinc-950 p-8">

          <h2 className="text-2xl font-semibold">
            Planned Features
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">

            <div className="rounded-lg border border-zinc-700 p-4">
              ✅ Introduction
            </div>

            <div className="rounded-lg border border-zinc-700 p-4">
              ✅ Project Overview
            </div>

            <div className="rounded-lg border border-zinc-700 p-4">
              ✅ Problem Statement
            </div>

            <div className="rounded-lg border border-zinc-700 p-4">
              ✅ Business Goals
            </div>

            <div className="rounded-lg border border-zinc-700 p-4">
              ✅ Functional Requirements
            </div>

            <div className="rounded-lg border border-zinc-700 p-4">
               Generated Non-Functional Requirements (Coming Soon)
            </div>

            <div className="rounded-lg border border-zinc-700 p-4">
               Generated Constraints (Coming Soon)
            </div>

            <div className="rounded-lg border border-zinc-700 p-4">
               Generated Future Scope (Coming Soon)
            </div>

            <div className="rounded-lg border border-zinc-700 p-4">
               Export as PDF (Coming Soon)
            </div>

            <div className="rounded-lg border border-zinc-700 p-4">
               Export as DOCX (Coming Soon)
            </div>

          </div>

        </div>

        <div className="mt-10 rounded-xl border border-blue-700 bg-blue-950/30 p-6 text-center">

          <h2 className="text-2xl font-bold text-blue-400">
             Thank You
          </h2>

          <p className="mt-4 text-zinc-300 leading-7">
           You've reached the current scope of our MVP. 
           The SRS Generator is planned for a future release as the project continues to grow with contributions from our team.
          </p>

        </div>

      </div>
    </main>
  );
}