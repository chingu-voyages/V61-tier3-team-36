import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">

        <Link
          href="/"
          className="text-2xl font-bold text-blue-600"
        >
          FlowSpec
        </Link>

        <nav className="flex items-center gap-8">

          <Link
            href="/dashboard"
            className="font-medium text-gray-700 hover:text-blue-600"
          >
            Dashboard
          </Link>

          <Link
            href="/create-project"
            className="font-medium text-gray-700 hover:text-blue-600"
          >
            New Project
          </Link>

        </nav>

        <div className="flex items-center gap-4">

          <button className="rounded-full bg-gray-100 p-2 hover:bg-gray-200">
            🔔
          </button>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
            A
          </div>

        </div>

      </div>
    </header>
  );
}