"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  projectId: string;
  initialProblemStatement: string;
  initialBusinessGoals: string;
};

export default function ProblemForm({
  projectId,
  initialProblemStatement,
  initialBusinessGoals,
}: Props) {
  const router = useRouter();

  const [problemStatement, setProblemStatement] = useState(
    initialProblemStatement
  );

  const [businessGoals, setBusinessGoals] = useState(
    initialBusinessGoals
  );

  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          problemStatement,
          businessGoals,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save project.");
      }

      router.refresh();

      alert("Problem statement saved successfully!");
    } catch (error) {
      console.error(error);
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <label className="block text-lg font-semibold mb-3">
          Problem Statement
        </label>

        <textarea
          rows={8}
          value={problemStatement}
          onChange={(e) => setProblemStatement(e.target.value)}
          placeholder="Describe the problem your software aims to solve..."
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-lg font-semibold mb-3">
          Business Goals
        </label>

        <textarea
          rows={6}
          value={businessGoals}
          onChange={(e) => setBusinessGoals(e.target.value)}
          placeholder="Describe the expected business outcomes..."
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-6 py-3 font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}