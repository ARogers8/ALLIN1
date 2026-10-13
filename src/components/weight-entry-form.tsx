"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Trash2 } from "lucide-react";
import { deleteWeight, logWeight } from "@/app/actions/logs";
import { Button, Input } from "./ui";

export function WeightEntryForm({ today, unit, initial }: { today: string; unit: string; initial: string }) {
  const [date, setDate] = useState(today);
  const [value, setValue] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const n = parseFloat(value);
        if (!Number.isFinite(n)) return setMsg({ ok: false, text: "Enter your weight" });
        start(async () => {
          const res = await logWeight(date, n);
          setMsg(res && "error" in res && res.error ? { ok: false, text: res.error } : { ok: true, text: "Saved" });
          setTimeout(() => setMsg(null), 2000);
        });
      }}
    >
      <div className="relative">
        <Input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" placeholder="0.0" className="h-14 pr-12 text-2xl font-semibold tabular" />
        <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-ink-500">{unit}</span>
      </div>
      <Input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Log weigh-in
      </Button>
      {msg && <p className={msg.ok ? "text-sm text-volt" : "text-sm text-ember"}>{msg.text}</p>}
    </form>
  );
}

export function DeleteWeightButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => deleteWeight(id))}
      disabled={pending}
      className="grid size-7 place-items-center rounded-lg text-ink-600 opacity-0 transition group-hover:opacity-100 hover:bg-ember/10 hover:text-ember"
      aria-label="Delete weigh-in"
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
    </button>
  );
}
