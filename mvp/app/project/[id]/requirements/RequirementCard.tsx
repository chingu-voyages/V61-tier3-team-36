"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RequirementModal from "./RequirementModal";

type Requirement = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
};

type Props = {
  requirement: Requirement;
};

export default function RequirementCard({ requirement }: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this requirement?"
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/requirements/${requirement.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete requirement");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to delete requirement.");
    }
  }

  return (
    <>
      <div className="border border-zinc-700 rounded-xl p-6 hover:border-zinc-600 transition">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h2 className="text-2xl font-semibold">
              {requirement.title}
            </h2>

            <p className="mt-3 text-zinc-300 whitespace-pre-wrap">
              {requirement.description}
            </p>

            <div className="flex gap-3 mt-5">
              <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 text-sm">
                {requirement.priority}
              </span>

              <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-sm">
                {requirement.status}
              </span>
            </div>
          </div>

          <div className="flex gap-2 ml-6">
            <button
              onClick={() => setOpen(true)}
              className="px-3 py-2 rounded-lg border border-zinc-600 hover:bg-zinc-800 transition"
            >
              Edit
            </button>

            <button
              onClick={handleDelete}
              className="px-3 py-2 rounded-lg border border-red-700 text-red-400 hover:bg-red-900/20 transition"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <RequirementModal
        projectId={requirement.projectId}
        requirement={requirement}
        open={open}
        onClose={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}