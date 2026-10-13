"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Camera, Check, History, Loader2, Minus, PenLine, Plus, RotateCcw, Sparkles, Trash2, X } from "lucide-react";
import clsx from "clsx";
import { logFoods, logSavedFood } from "@/app/actions/logs";
import { normalizeKey } from "@/lib/text";
import { actionErrorMessage } from "@/lib/action-error";
import { MEALS, type MealKey } from "@/lib/meals";
import { Badge, Button, Input } from "./ui";


export interface SavedFoodLite {
  id: string;
  name: string;
  servingDesc: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timesLogged: number;
}

interface Question {
  id: string;
  question: string;
  options: string[];
  allowMultiple: boolean;
}

interface Item {
  name: string;
  servingDescription: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
}

interface Analysis {
  source: "ai" | "memory";
  status: "needs_clarification" | "complete";
  questions: Question[];
  items: Item[];
  confidence: "low" | "medium" | "high";
  notes: string;
}

function mealForNow(): MealKey {
  const h = new Date().getHours();
  if (h < 11) return "BREAKFAST";
  if (h < 15) return "LUNCH";
  if (h < 21) return "DINNER";
  return "SNACK";
}

async function fileToJpegBase64(file: File): Promise<{ data: string; mediaType: "image/jpeg"; preview: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const max = 1280;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const preview = canvas.toDataURL("image/jpeg", 0.85);
    return { data: preview.split(",")[1], mediaType: "image/jpeg", preview };
  } finally {
    URL.revokeObjectURL(url);
  }
}

const r = (n: number) => Math.round(n);

export function FoodLogger({ date, saved, defaultMeal }: { date: string; saved: SavedFoodLite[]; defaultMeal?: MealKey }) {
  const [meal, setMeal] = useState<MealKey>(defaultMeal ?? "BREAKFAST");
  useEffect(() => {
    if (!defaultMeal) setMeal(mealForNow());
  }, [defaultMeal]);

  const [mode, setMode] = useState<"describe" | "manual">("describe");
  const [text, setText] = useState("");
  const [image, setImage] = useState<{ data: string; mediaType: "image/jpeg"; preview: string } | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [answers, setAnswers] = useState<{ question: string; answer: string }[]>([]);
  const [rounds, setRounds] = useState(0);
  const [picks, setPicks] = useState<Record<string, string[]>>({});
  const [other, setOther] = useState<Record<string, string>>({});
  const [items, setItems] = useState<Item[]>([]);
  const [servings, setServings] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    const k = normalizeKey(text);
    const list = k ? saved.filter((s) => normalizeKey(s.name).includes(k) || normalizeKey(s.servingDesc).includes(k)) : saved;
    return list.slice(0, k ? 8 : 5);
  }, [text, saved]);

  function reset() {
    setText("");
    setImage(null);
    setAnalysis(null);
    setAnswers([]);
    setRounds(0);
    setPicks({});
    setOther({});
    setItems([]);
    setServings(1);
    setError(null);
  }

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  async function analyze(opts: { answers?: { question: string; answer: string }[]; rounds?: number; fresh?: boolean } = {}) {
    if (!text.trim() && !image) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/food/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim() || undefined,
          image: image ? { data: image.data, mediaType: image.mediaType } : undefined,
          answers: opts.answers?.length ? opts.answers : undefined,
          rounds: opts.rounds,
          fresh: opts.fresh,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong");
      setAnalysis(json);
      setItems(json.items);
      setPicks({});
      setOther({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function submitAnswers() {
    if (!analysis) return;
    const round = analysis.questions.map((q) => {
      const chosen = [...(picks[q.id] ?? [])];
      if (other[q.id]?.trim()) chosen.push(other[q.id].trim());
      return { question: q.question, answer: chosen.length ? chosen.join(", ") : "Not sure, assume the typical choice" };
    });
    const all = [...answers, ...round];
    setAnswers(all);
    setRounds(rounds + 1);
    analyze({ answers: all, rounds: rounds + 1 });
  }

  function toggle(q: Question, opt: string) {
    setPicks((p) => {
      const cur = p[q.id] ?? [];
      if (q.allowMultiple) return { ...p, [q.id]: cur.includes(opt) ? cur.filter((o) => o !== opt) : [...cur, opt] };
      return { ...p, [q.id]: cur[0] === opt ? [] : [opt] };
    });
  }

  function save() {
    if (!items.length) return;
    setError(null);
    start(async () => {
      try {
        const res = await logFoods({
          date,
          meal,
          servings,
          phrase: image ? undefined : text,
          items: items.map((i) => ({
            name: i.name,
            servingDesc: i.servingDescription,
            calories: i.calories,
            protein: i.protein_g,
            carbs: i.carbs_g,
            fat: i.fat_g,
            fiber: i.fiber_g,
            sugar: i.sugar_g,
            sodium: i.sodium_mg,
          })),
        });
        if (res?.ok) {
          flash(`Added to ${MEALS.find((m) => m.key === meal)!.label.toLowerCase()}`);
          reset();
        }
      } catch (e) {
        setError(actionErrorMessage(e));
      }
    });
  }

  function quickAdd(s: SavedFoodLite, n: number) {
    start(async () => {
      try {
        const res = await logSavedFood({ date, meal, savedFoodId: s.id, servings: n });
        if (res && "ok" in res) {
          flash(`${s.name} added`);
          setText("");
        } else if (res && "error" in res) setError(res.error ?? null);
      } catch (e) {
        setError(actionErrorMessage(e));
      }
    });
  }

  const totals = items.reduce(
    (a, i) => ({ calories: a.calories + i.calories, protein: a.protein + i.protein_g, carbs: a.carbs + i.carbs_g, fat: a.fat + i.fat_g }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const asking = analysis?.status === "needs_clarification" && analysis.questions.length > 0;
  const done = analysis && !asking && items.length > 0;

  return (
    <div className="card relative overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-volt/10 blur-3xl" />

      {/* Meal picker */}
      <div className="relative mb-4 flex items-center justify-between gap-3">
        <div className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1">
          {MEALS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMeal(m.key)}
              className={clsx(
                "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition",
                meal === m.key ? "bg-ink-100 text-ink-950" : "text-ink-400 hover:bg-white/[0.06] hover:text-ink-100",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            reset();
            setMode(mode === "describe" ? "manual" : "describe");
          }}
          className="flex shrink-0 items-center gap-1.5 text-xs text-ink-400 hover:text-ink-100"
        >
          {mode === "describe" ? (
            <>
              <PenLine className="size-3.5" /> Enter manually
            </>
          ) : (
            <>
              <Sparkles className="size-3.5" /> Describe instead
            </>
          )}
        </button>
      </div>

      {mode === "manual" ? (
        <ManualEntry date={date} meal={meal} onDone={(name) => flash(`${name} added`)} />
      ) : (
        <>
          {/* Input */}
          {!analysis && (
            <div className="relative">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  analyze();
                }}
              >
                <div className="rounded-2xl border border-white/[0.08] bg-ink-900/80 transition focus-within:border-volt/60 focus-within:ring-4 focus-within:ring-volt/10">
                  {image && (
                    <div className="relative m-3 mb-0 inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.preview} alt="Meal photo" className="h-28 rounded-xl object-cover" />
                      <button type="button" onClick={() => setImage(null)} className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-ink-800 text-ink-300 ring-1 ring-white/10">
                        <X className="size-3.5" />
                      </button>
                    </div>
                  )}
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        analyze();
                      }
                    }}
                    rows={2}
                    placeholder={image ? "Add details (optional): brand, sauces, how much you ate…" : "What did you eat? e.g. “Philly cheesesteak from Subway and a bag of Lay's”"}
                    className="block w-full resize-none bg-transparent px-4 pt-3.5 text-[15px] text-ink-100 outline-none placeholder:text-ink-500"
                  />
                  <div className="flex items-center justify-between gap-2 px-3 pb-3">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm text-ink-400 transition hover:bg-white/[0.06] hover:text-ink-100"
                    >
                      <Camera className="size-4.5" /> Photo
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (f) setImage(await fileToJpegBase64(f));
                        e.target.value = "";
                      }}
                    />
                    <Button type="submit" size="sm" disabled={loading || (!text.trim() && !image)}>
                      {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                      {loading ? "Analyzing…" : "Analyze"}
                    </Button>
                  </div>
                </div>
              </form>

              {/* Saved / recent foods */}
              {suggestions.length > 0 && !loading && (
                <div className="mt-4">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink-500">
                    <History className="size-3.5" /> {text ? "From your history" : "Your usual"}
                  </div>
                  <div className="space-y-1.5">
                    {suggestions.map((s) => (
                      <SavedRow key={s.id} food={s} onAdd={(n) => quickAdd(s, n)} disabled={pending} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {loading && analysis && (
            <div className="flex items-center gap-3 py-6 text-sm text-ink-400">
              <Loader2 className="size-4 animate-spin text-volt" /> Working out the exact numbers…
            </div>
          )}

          {/* Clarifying questions */}
          {analysis && asking && !loading && (
            <div className="animate-rise space-y-5">
              <div className="flex items-start gap-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-volt/15 text-volt">
                  <Sparkles className="size-4" />
                </div>
                <div className="text-sm">
                  <p className="text-ink-200">A few quick questions so the numbers are accurate:</p>
                  <p className="mt-0.5 text-ink-500">
                    Current estimate: <span className="tabular text-ink-300">{r(totals.calories)} kcal</span>
                  </p>
                </div>
              </div>
              {analysis.questions.map((q) => (
                <div key={q.id}>
                  <div className="mb-2 text-[15px] font-medium">
                    {q.question}
                    {q.allowMultiple && <span className="ml-2 text-xs font-normal text-ink-500">pick all that apply</span>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {q.options.map((o) => {
                      const on = picks[q.id]?.includes(o);
                      return (
                        <button
                          key={o}
                          onClick={() => toggle(q, o)}
                          className={clsx(
                            "rounded-full border px-3.5 py-1.5 text-sm transition",
                            on ? "border-volt bg-volt text-ink-950" : "border-white/[0.08] text-ink-200 hover:border-white/20",
                          )}
                        >
                          {on && <Check className="mr-1 inline size-3.5" strokeWidth={3} />}
                          {o}
                        </button>
                      );
                    })}
                    <input
                      value={other[q.id] ?? ""}
                      onChange={(e) => setOther({ ...other, [q.id]: e.target.value })}
                      placeholder="Other…"
                      className="w-28 rounded-full border border-dashed border-white/[0.12] bg-transparent px-3.5 py-1.5 text-sm outline-none placeholder:text-ink-500 focus:w-48 focus:border-volt/60"
                    />
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <Button onClick={submitAnswers}>Continue</Button>
                <Button variant="ghost" onClick={reset}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Result */}
          {done && !loading && (
            <div className="animate-rise">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {analysis.source === "memory" ? (
                  <Badge tone="violet">
                    <History className="size-3" /> From your history
                  </Badge>
                ) : (
                  <Badge tone={analysis.confidence === "high" ? "volt" : analysis.confidence === "medium" ? "sky" : "flame"}>
                    <Sparkles className="size-3" /> {analysis.confidence} confidence
                  </Badge>
                )}
                <span className="text-xs text-ink-500">{analysis.notes}</span>
              </div>
              <ul className="divide-y divide-white/[0.05] rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                {items.map((i, idx) => (
                  <li key={idx} className="flex items-start gap-3 p-3.5">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{i.name}</div>
                      <div className="text-xs text-ink-500">{i.servingDescription}</div>
                      <div className="mt-1.5 flex gap-3 text-xs tabular text-ink-400">
                        <span>
                          <span className="text-sky">P</span> {r(i.protein_g * servings)}g
                        </span>
                        <span>
                          <span className="text-amber">C</span> {r(i.carbs_g * servings)}g
                        </span>
                        <span>
                          <span className="text-violet">F</span> {r(i.fat_g * servings)}g
                        </span>
                      </div>
                    </div>
                    <div className="tabular text-right font-semibold">
                      {r(i.calories * servings)}
                      <div className="text-[11px] font-normal text-ink-500">kcal</div>
                    </div>
                    {items.length > 1 && (
                      <button onClick={() => setItems(items.filter((_, j) => j !== idx))} className="mt-0.5 text-ink-500 hover:text-ember" aria-label="Remove">
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Stepper value={servings} onChange={setServings} />
                  <span className="text-sm text-ink-400">serving{servings === 1 ? "" : "s"}</span>
                </div>
                <div className="tabular text-right">
                  <span className="text-2xl font-semibold">{r(totals.calories * servings)}</span> <span className="text-sm text-ink-400">kcal</span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={save} disabled={pending}>
                  {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  Add to {MEALS.find((m) => m.key === meal)!.label.toLowerCase()}
                </Button>
                {analysis.source === "memory" && (
                  <Button variant="secondary" onClick={() => analyze({ fresh: true })}>
                    <RotateCcw className="size-4" /> Re-analyze
                  </Button>
                )}
                <Button variant="ghost" onClick={reset}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {error && <p className="mt-4 rounded-xl bg-ember/10 px-3 py-2 text-sm text-ember">{error}</p>}
      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 animate-rise items-center gap-2 rounded-full bg-ink-100 px-4 py-2 text-sm font-medium text-ink-950 shadow-2xl lg:bottom-8">
          <Check className="size-4" strokeWidth={3} /> {toast}
        </div>
      )}
    </div>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const step = (d: number) => onChange(Math.max(0.25, Math.round((value + d) * 4) / 4));
  return (
    <div className="inline-flex items-center rounded-xl border border-white/[0.08] bg-ink-900/80">
      <button type="button" onClick={() => step(-0.25)} className="grid size-9 place-items-center text-ink-400 hover:text-ink-100" aria-label="Fewer servings">
        <Minus className="size-4" />
      </button>
      <span className="tabular w-10 text-center text-sm font-medium">{value}</span>
      <button type="button" onClick={() => step(0.25)} className="grid size-9 place-items-center text-ink-400 hover:text-ink-100" aria-label="More servings">
        <Plus className="size-4" />
      </button>
    </div>
  );
}

function SavedRow({ food, onAdd, disabled }: { food: SavedFoodLite; onAdd: (servings: number) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [n, setN] = useState(1);
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] transition hover:border-white/[0.1]">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{food.name}</div>
          <div className="truncate text-xs text-ink-500">{food.servingDesc || `Logged ${food.timesLogged}×`}</div>
        </div>
        <span className="tabular text-sm text-ink-300">{r(food.calories)}</span>
        <span className="grid size-7 place-items-center rounded-lg bg-white/[0.06] text-ink-300">
          <Plus className="size-4" />
        </span>
      </button>
      {open && (
        <div className="flex items-center justify-between gap-3 border-t border-white/[0.05] px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <Stepper value={n} onChange={setN} />
            <span className="tabular text-sm text-ink-400">= {r(food.calories * n)} kcal</span>
          </div>
          <Button size="sm" disabled={disabled} onClick={() => onAdd(n)}>
            Add
          </Button>
        </div>
      )}
    </div>
  );
}

function ManualEntry({ date, meal, onDone }: { date: string; meal: MealKey; onDone: (name: string) => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="grid gap-3 sm:grid-cols-6"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const num = (k: string) => parseFloat(String(f.get(k) || "0")) || 0;
        const name = String(f.get("name") || "").trim();
        if (!name) return setError("Give it a name");
        const form = e.currentTarget;
        start(async () => {
          try {
            await logFoods({
              date,
              meal,
              phrase: name,
              items: [{ name, servingDesc: String(f.get("serving") || ""), calories: num("calories"), protein: num("protein"), carbs: num("carbs"), fat: num("fat") }],
            });
            form.reset();
            setError(null);
            onDone(name);
          } catch (e) {
            setError(actionErrorMessage(e));
          }
        });
      }}
    >
      <Input name="name" placeholder="Food name" className="sm:col-span-4" />
      <Input name="serving" placeholder="Serving (e.g. 1 cup)" className="sm:col-span-2" />
      <Input name="calories" type="number" inputMode="decimal" placeholder="kcal" className="sm:col-span-2" required />
      <Input name="protein" type="number" inputMode="decimal" step="0.1" placeholder="Protein g" className="sm:col-span-2" />
      <Input name="carbs" type="number" inputMode="decimal" step="0.1" placeholder="Carbs g" className="sm:col-span-1" />
      <Input name="fat" type="number" inputMode="decimal" step="0.1" placeholder="Fat g" className="sm:col-span-1" />
      {error && <p className="text-sm text-ember sm:col-span-6">{error}</p>}
      <div className="sm:col-span-6">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add food
        </Button>
      </div>
    </form>
  );
}
