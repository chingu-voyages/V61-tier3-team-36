"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function CreateProject() {
  const router = useRouter();

  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");

  async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();

  const response = await fetch("/api/projects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: projectName,
      description,
      deadline,
    }),
  });

  if (!response.ok) {
    toast.error("Failed to create project.");
    return;
  }

  const project = await response.json();

  router.push(`/project/${project.id}/overview`);
}

  return (
    <main className="max-w-2xl mx-auto mt-20">

      <h1 className="text-4xl font-bold mb-8">
        Create Project
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">

        <div>
          <label>Project Name</label>

          <input className="w-full border rounded p-3" value={projectName} onChange={(e) => setProjectName(e.target.value) } />
        </div>

        <div>
          <label>Description</label>

          <textarea className="w-full border rounded p-3" rows={5} value={description} onChange={(e) => setDescription(e.target.value)}/>
        </div>

        <div>
          <label>Deadline</label>

          <input type="date" className="w-full border rounded p-3" value={deadline} onChange={(e) => setDeadline(e.target.value)}/>
        </div>

        <button className="bg-black text-white px-6 py-3 rounded">
          Create Project
        </button>

      </form>

    </main>
  );
}