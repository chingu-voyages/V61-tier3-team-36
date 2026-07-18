import Link from "next/link";
import Button from "../ui/Button";

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
        href="/login"
        className="font-medium text-gray-700 hover:text-blue-600"
      >
        Login
      </Link>

      <Link href="/signup">
        <Button>Sign Up</Button>
      </Link>
    </nav>
  </div>
</header>
  );
}