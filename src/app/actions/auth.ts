"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentUser, endSession, startSession } from "@/lib/auth";
import { checkVerificationCode, resendCooldown, sendVerificationCode, verificationEnabled } from "@/lib/email-verification";

export type FormState = { error?: string } | undefined;

const SignupSchema = z.object({
  name: z.string().trim().min(1, "Tell us your name").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters").max(200),
});

export async function signup(_: FormState, form: FormData): Promise<FormState> {
  const parsed = SignupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password } = parsed.data;
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    // A sign-up that never confirmed its email (and so holds no data) doesn't block the address.
    const abandoned = verificationEnabled() && !existing.emailVerifiedAt && !existing.onboarded;
    if (!abandoned) return { error: "An account with that email already exists" };
    await db.user.delete({ where: { id: existing.id } });
  }
  const user = await db.user.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 12) } });
  await startSession(user.id);
  if (!verificationEnabled()) redirect("/onboarding");
  let sent = true;
  try {
    await sendVerificationCode(user);
  } catch {
    sent = false;
  }
  redirect(sent ? "/verify" : "/verify?error=send");
}

export type VerifyState = { error?: string; info?: string } | undefined;

export async function verifyEmail(_: VerifyState, form: FormData): Promise<VerifyState> {
  const user = await currentUser();
  if (!user) redirect("/login");
  const code = String(form.get("code") ?? "").replace(/\D/g, "");
  if (code.length !== 6) return { error: "Enter the 6-digit code from your email" };
  const result = await checkVerificationCode(user.id, code);
  if (result === "ok") redirect(user.onboarded ? "/dashboard" : "/onboarding");
  if (result === "wrong") return { error: "That code isn't right. Check the email and try again." };
  if (result === "too_many") return { error: "Too many wrong tries. Send a new code." };
  return { error: "That code has expired. Send a new one." };
}

export async function resendVerification(): Promise<VerifyState> {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.emailVerifiedAt) redirect("/dashboard");
  const wait = await resendCooldown(user.id);
  if (wait > 0) return { error: `You can ask for a new code in ${wait}s.` };
  try {
    await sendVerificationCode(user);
  } catch {
    return { error: "We couldn't send the email. Try again in a minute." };
  }
  return { info: `New code sent to ${user.email}.` };
}

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const parsed = LoginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return { error: "Wrong email or password" };
  await startSession(user.id);
  if (verificationEnabled() && !user.emailVerifiedAt) {
    if ((await resendCooldown(user.id)) === 0) await sendVerificationCode(user).catch(() => undefined);
    redirect("/verify");
  }
  redirect(user.onboarded ? "/dashboard" : "/onboarding");
}

export async function logout() {
  await endSession();
  redirect("/login");
}
