"use client";

import { useTransition } from "react";
import { Copy, Loader2, Trash2 } from "lucide-react";
import { copyMeal, deleteFood } from "@/app/actions/logs";

export function DeleteFoodButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => deleteFood(id))}
      disabled={pending}
      className="grid size-8 place-items-center rounded-lg text-ink-500 opacity-60 transition hover:bg-ember/10 hover:text-ember group-hover:opacity-100"
      aria-label="Delete"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
    </button>
  );
}

export function CopyMealButton({ fromDate, toDate, meal, label }: { fromDate: string; toDate: string; meal: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(async () => void (await copyMeal({ fromDate, toDate, meal })))}
      disabled={pending}
      className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-ink-400 transition hover:bg-white/[0.06] hover:text-ink-100"
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Copy className="size-3.5" />} {label}
    </button>
  );
}
