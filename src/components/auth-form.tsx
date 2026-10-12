"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { login, signup, type FormState } from "@/app/actions/auth";
import { Button, Field, Input, Logo } from "./ui";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [state, action, pending] = useActionState<FormState, FormData>(mode === "login" ? login : signup, undefined);
  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm animate-rise">
        <Link href="/" className="mb-10 flex justify-center text-xl">
          <Logo />
        </Link>
        <div className="card p-6 sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p className="mt-1 text-sm text-ink-400">
            {mode === "login" ? "Log in to pick up where you left off." : "Takes a minute. Your data stays yours."}
          </p>
          <form action={action} className="mt-6 space-y-4">
            {mode === "signup" && (
              <Field label="Name">
                <Input name="name" autoComplete="given-name" placeholder="Alex" required />
              </Field>
            )}
            <Field label="Email">
              <Input name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
            </Field>
            <Field label="Password" hint={mode === "signup" ? "8+ characters" : undefined}>
              <Input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "signup" ? 8 : 1} />
            </Field>
            {state?.error && <p className="rounded-xl bg-ember/10 px-3 py-2 text-sm text-ember">{state.error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <>{mode === "login" ? "Log in" : "Create account"} <ArrowRight className="size-4" /></>}
            </Button>
          </form>
        </div>
        <p className="mt-6 text-center text-sm text-ink-400">
          {mode === "login" ? (
            <>
              New here? <Link href="/signup" className="font-medium text-volt hover:underline">Create an account</Link>
            </>
          ) : (
            <>
              Already have an account? <Link href="/login" className="font-medium text-volt hover:underline">Log in</Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
