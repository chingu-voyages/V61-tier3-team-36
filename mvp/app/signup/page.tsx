"use client";

import { useState } from "react";
import Link from "next/link";

import Card from "@/app/components/ui/Card";
import Input from "@/app/components/ui/Input";
import Button from "@/app/components/ui/Button";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6">
      <Card className="w-full max-w-md p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-blue-500">
            FlowSpec
          </h1>

          <h2 className="mt-6 text-2xl font-semibold text-white">
            Create your account
          </h2>

          <p className="mt-2 text-zinc-400">
            Start planning software professionally.
          </p>
        </div>

        <form className="mt-8 space-y-5">

          <Input
            label="Full Name"
            value={name}
            placeholder="John Doe"
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            label="Email"
            type="email"
            value={email}
            placeholder="john@example.com"
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Password"
            type="password"
            value={password}
            placeholder="Enter password"
            onChange={(e) => setPassword(e.target.value)}
          />

          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            placeholder="Confirm password"
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <Button
            type="submit"
            className="w-full"
          >
            Create Account
          </Button>

        </form>

        <p className="mt-8 text-center text-sm text-zinc-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-blue-500 hover:underline"
          >
            Login
          </Link>
        </p>
      </Card>
    </main>
  );
}