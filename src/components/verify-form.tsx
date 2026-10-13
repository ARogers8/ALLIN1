"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { Loader2, Mail } from "lucide-react";
import { logout, resendVerification, verifyEmail, type VerifyState } from "@/app/actions/auth";
import { Button, Logo } from "./ui";

export function VerifyForm({ email, sendFailed }: { email: string; sendFailed: boolean }) {
  const [state, action, pending] = useActionState<VerifyState, FormData>(verifyEmail, undefined);
  const [message, setMessage] = useState<VerifyState>(sendFailed ? { error: "We couldn't send the email. Tap “Send a new code”." } : undefined);
  const [resending, startResend] = useTransition();
  // Show whichever happened last: a verify attempt or a resend.
  useEffect(() => {
    if (state) setMessage(state);
  }, [state]);

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm animate-rise">
        <Link href="/" className="mb-10 flex justify-center text-xl">
          <Logo />
        </Link>
        <div className="card p-6 sm:p-8">
          <div className="mb-5 grid size-12 place-items-center rounded-2xl bg-volt/15 text-volt">
            <Mail className="size-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Check your email</h1>
          <p className="mt-1 text-sm text-ink-400">
            We sent a 6-digit code to <span className="font-medium text-ink-200">{email}</span>. Enter it below to finish signing up.
          </p>
          <form action={action} className="mt-6 space-y-4">
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]*"
              maxLength={7}
              autoFocus
              required
              placeholder="000000"
              aria-label="Verification code"
              className="h-16 w-full rounded-2xl border border-white/[0.08] bg-ink-900/80 text-center font-mono text-3xl tracking-[0.5em] text-ink-100 outline-none transition placeholder:text-ink-700 focus:border-volt/60 focus:ring-4 focus:ring-volt/10"
            />
            {message?.error && <p className="rounded-xl bg-ember/10 px-3 py-2 text-sm text-ember">{message.error}</p>}
            {message?.info && <p className="rounded-xl bg-volt/10 px-3 py-2 text-sm text-volt">{message.info}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : "Verify email"}
            </Button>
          </form>
          <div className="mt-5 flex items-center justify-between text-sm">
            <button
              type="button"
              disabled={resending}
              onClick={() => startResend(async () => setMessage(await resendVerification()))}
              className="font-medium text-volt hover:underline disabled:opacity-50"
            >
              {resending ? "Sending…" : "Send a new code"}
            </button>
            <form action={logout}>
              <button className="text-ink-400 hover:text-ink-200">Wrong email?</button>
            </form>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-ink-500">Can&apos;t find it? Check your spam folder. Codes expire after 15 minutes.</p>
      </div>
    </div>
  );
}
