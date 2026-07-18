import Link from "next/link";

import Navbar from "@/app/components/layout/Navbar";
import Button from "@/app/components/ui/Button";
import Card from "@/app/components/ui/Card";

export default function Home() {
  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-zinc-950 text-white">

        {/* Hero */}

        <section className="mx-auto flex max-w-7xl flex-col items-center px-6 py-32 text-center">

          <h1 className="max-w-4xl text-6xl font-bold tracking-tight">
            Plan Software
            <br />
            Before You Build It.
          </h1>

          <p className="mt-8 max-w-2xl text-lg text-zinc-400">
            Turn ideas into structured software specifications.
            Define problems, gather requirements, and generate
            professional Software Requirement Specifications.
          </p>

          <div className="mt-10 flex gap-4">
            <Link href="/dashboard">
              <Button>Create Project</Button>
            </Link>

            <Link href="/dashboard">
              <Button className="bg-zinc-800 hover:bg-zinc-700">
                Dashboard
              </Button>
            </Link>
          </div>

        </section>

        {/* Features */}

        <section className="mx-auto grid max-w-5xl gap-8 px-6 pb-28 md:grid-cols-2">

          
        </section>

      </main>
    </>
  );
}