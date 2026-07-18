"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  projectId: string;
  open: boolean;
  onClose: () => void;
};

export default function RequirementModal({
  projectId,
  open,
  onClose,
}: Props) {
   
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [status, setStatus] = useState("TODO");
  const [loading, setLoading] = useState(false);
  if (!open) return null;

async function handleSubmit() {
  if (!title.trim()) {
    alert("Title is required");
    return;
  }

  setLoading(true);

  try {
    const response = await fetch(
      `/api/projects/${projectId}/requirements`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          priority,
          status,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to create requirement");
    }

    onClose();

    router.refresh();

  } catch (error) {
    console.error(error);
    alert("Something went wrong.");
  } finally {
    setLoading(false);
  }
}

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">

      <div className="bg-zinc-900 rounded-xl w-full max-w-xl p-8 border border-zinc-700">

        <h2 className="text-2xl font-bold mb-6">
          New Requirement
        </h2>

        <div className="space-y-5">

          <div>
            <label className="block mb-2">
              Title
            </label>

            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-3"/>
          </div>

          <div>
            <label className="block mb-2">
              Description
            </label>

            <textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-3"/>
          </div>

          <div className="grid grid-cols-2 gap-4">

            <div>
              <label className="block mb-2">
                Priority
              </label>

              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-3">
                <option>LOW</option>
                <option>MEDIUM</option>
                <option>HIGH</option>
                <option>CRITICAL</option>
              </select>
            </div>

            <div>
              <label className="block mb-2">
                Status
              </label>

              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-3">
                <option>TODO</option>
                <option>IN_PROGRESS</option>
                <option>DONE</option>
              </select>
            </div>

          </div>

          <div className="flex justify-end gap-3 pt-4">

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-lg border border-zinc-600"
            >
              Cancel
            </button>

           <button onClick={handleSubmit} disabled={loading} className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
               {loading ? "Creating..." : "Create Requirement"}
           </button>

          </div>

        </div>

      </div>

    </div>
  );
}