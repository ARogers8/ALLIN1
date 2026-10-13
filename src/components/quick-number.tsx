"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { logSteps, logWeight } from "@/app/actions/logs";
import { Button, Input } from "./ui";

/** One-field logger for weight or steps. */
export function QuickNumber({
  kind,
  date,
  initial,
  unit,
  placeholder,
}: {
  kind: "weight" | "steps";
  date: string;
  initial: number | null;
  unit: string;
  placeholder: string;
}) {
  const [value, setValue] = useState(initial != null ? String(initial) : "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseFloat(value.replace(/,/g, ""));
    if (!Number.isFinite(n)) return setError("Enter a number");
    setError(null);
    start(async () => {
      const res = kind === "weight" ? await logWeight(date, n) : await logSteps(date, n);
      if (res && "error" in res && res.error) setError(res.error);
      else {
        setSaved(true);
        setTimeout(() => setSaved(false), 1800);
      }
    });
  }

  return (
    <form onSubmit={submit}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            inputMode={kind === "weight" ? "decimal" : "numeric"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="pr-12 text-lg font-medium tabular"
            aria-label={kind === "weight" ? "Weight" : "Steps"}
          />
          <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm text-ink-500">{unit}</span>
        </div>
        <Button type="submit" disabled={pending || !value} className="w-20">
          {pending ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4" /> : "Save"}
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-ember">{error}</p>}
    </form>
  );
}
