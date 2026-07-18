"use client";

import { useState } from "react";
import RequirementModal from "./RequirementModal";

type Props = {
  projectId: string;
};

export default function NewRequirementButton({ projectId }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition"
      >
        + New Requirement
      </button>

      <RequirementModal
        projectId={projectId}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}