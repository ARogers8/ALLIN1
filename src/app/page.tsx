import Link from "next/link";
import { ArrowRight, Camera, Dumbbell, LineChart, MessageCircleQuestion, Scale, Target } from "lucide-react";
import { Logo } from "@/components/ui";
import { Ring } from "@/components/ring";

const FEATURES = [
  {
    icon: MessageCircleQuestion,
    title: "Log food like you'd text a friend",
    body: "Type “Philly cheesesteak from Subway” or snap a photo. If the size or toppings change the numbers, it asks.",
    color: "text-volt",
  },
  {
    icon: Target,
    title: "A target built from your real day",
    body: "No vague activity levels. Your calories move with your actual steps and workouts, then self-correct from your weigh-ins.",
    color: "text-flame",
  },
  {
    icon: Dumbbell,
    title: "Every set, remembered",
    body: "Log sets and reps in seconds. Last time's numbers are already filled in so you can beat them.",
    color: "text-sky",
  },
  {
    icon: Scale,
    title: "See through the daily noise",
    body: "Weigh in each morning. A smoothed trend line shows whether you're really cutting or bulking.",
    color: "text-violet",
  },
  {
    icon: Camera,
    title: "Photos count too",
    body: "Point your camera at the plate. ALLIN1 estimates portions and reads labels and brands it can see.",
    color: "text-amber",
  },
  {
    icon: LineChart,
    title: "It learns your favorites",
    body: "Anything you've eaten before is one tap. Same breakfast as yesterday? Copy it.",
    color: "text-mint",
  },
];

export default function Landing() {
  return (
    <div className="min-h-dvh overflow-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo className="text-lg" />
        <div className="flex items-center gap-2">
          <Link href="/login" className="rounded-xl px-3 py-2 text-sm font-medium text-ink-300 hover:text-ink-100">
            Log in
          </Link>
          <Link href="/signup" className="rounded-xl bg-volt px-4 py-2 text-sm font-semibold text-ink-950 transition hover:bg-volt-600">
            Get started
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-10 pb-20 sm:px-8 lg:grid-cols-[1.2fr_1fr] lg:pt-20">
        <div className="animate-rise">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs text-ink-300">
            <span className="size-1.5 rounded-full bg-volt" /> Food · Workouts · Steps · Weight
          </span>
          <h1 className="mt-6 text-5xl leading-[1.02] font-semibold tracking-tight sm:text-6xl lg:text-7xl">
            Know exactly
            <br />
            what to <span className="text-gradient">eat</span>.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-400">
            Cutting or bulking is hard when &ldquo;active&rdquo; is a guess. ALLIN1 tracks what you eat, every set you lift, your steps and your weight, and turns it into one number for
            today.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-volt px-6 font-semibold text-ink-950 shadow-[0_10px_40px_-10px_rgb(196_245_66/0.6)] transition hover:bg-volt-600"
            >
              Create free account <ArrowRight className="size-4" />
            </Link>
            <Link href="/login" className="inline-flex h-12 items-center rounded-2xl border border-white/[0.1] px-6 font-medium text-ink-200 transition hover:bg-white/[0.04]">
              I have an account
            </Link>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-sm animate-rise [animation-delay:120ms]">
          <div className="absolute -inset-10 rounded-full bg-volt/10 blur-3xl" />
          <div className="card relative p-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-400">Today</span>
              <span className="rounded-full bg-sky/15 px-2.5 py-0.5 text-xs font-medium text-sky">Cutting · −1 lb/wk</span>
            </div>
            <div className="mt-4 flex justify-center">
              <Ring value={1640} max={2310} size={190} stroke={16}>
                <div>
                  <div className="tabular text-4xl font-semibold">670</div>
                  <div className="text-sm text-ink-400">kcal left</div>
                </div>
              </Ring>
            </div>
            <div className="mt-6 space-y-2 text-sm">
              {[
                ["Resting metabolism", "1,842"],
                ["Steps · 9,214", "+346"],
                ["Push day · 52 min", "+284"],
                ["Deficit to cut", "−500"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-ink-400">
                  <span>{k}</span>
                  <span className="tabular text-ink-200">{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-white/[0.06] bg-ink-900/70 p-3.5 text-sm">
              <div className="text-ink-300">Philly cheesesteak from Subway</div>
              <div className="mt-2 text-xs text-ink-500">Was it a 6-inch or a footlong?</div>
              <div className="mt-2 flex gap-1.5">
                <span className="rounded-full bg-volt px-3 py-1 text-xs font-medium text-ink-950">Footlong</span>
                <span className="rounded-full border border-white/[0.1] px-3 py-1 text-xs text-ink-300">6-inch</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body, color }) => (
            <div key={title} className="card p-6">
              <Icon className={`size-6 ${color}`} />
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-400">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/[0.05] py-8 text-center text-xs text-ink-500">ALLIN1 · Estimates are for guidance, not medical advice.</footer>
    </div>
  );
}
