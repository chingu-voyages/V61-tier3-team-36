export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <h1 className="text-6xl font-bold">FlowSpec</h1>

      <p className="mt-4 max-w-xl text-center text-lg text-gray-600">
        Plan software before you build it.
      </p>

      <button className="mt-8 rounded-lg bg-black px-6 py-3 text-white hover:bg-gray-800">
        Get Started
      </button>

      <section className="mt-20 grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border p-6">
          <h2 className="text-xl font-semibold">
            Create Projects
          </h2>

          <p className="mt-2 text-gray-600">
            Organize software ideas into structured projects.
          </p>
        </div>

        <div className="rounded-xl border p-6">
          <h2 className="text-xl font-semibold">
            Requirements
          </h2>

          <p className="mt-2 text-gray-600">
            Capture functional and non-functional requirements.
          </p>
        </div>

        <div className="rounded-xl border p-6">
          <h2 className="text-xl font-semibold">
            Generate SRS
          </h2>

          <p className="mt-2 text-gray-600">
            Automatically create a Software Requirements Specification.
          </p>
        </div>
      </section>
    </main>
  );
}