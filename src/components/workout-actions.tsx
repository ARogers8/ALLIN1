"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteWorkout } from "@/app/actions/logs";

export function DeleteWorkoutButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => {
        if (confirm("Delete this workout?")) start(() => deleteWorkout(id));
      }}
      disabled={pending}
      className="grid size-8 place-items-center rounded-lg text-ink-500 transition hover:bg-ember/10 hover:text-ember"
      aria-label="Delete workout"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
    </button>
  );
}
