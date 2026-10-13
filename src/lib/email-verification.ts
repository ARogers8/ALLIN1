import "server-only";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { db } from "./db";

export const CODE_TTL_MINUTES = 15;
export const MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_SECONDS = 60;

/** Verification is on only when an email provider is configured, so sign-up never breaks. */
export function verificationEnabled(): boolean {
  return !!process.env.RESEND_API_KEY;
}

function hash(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/** Creates a fresh 6-digit code for the user (replacing any older one) and emails it. */
export async function sendVerificationCode(user: { id: string; email: string; name: string }) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.$transaction([
    db.emailCode.deleteMany({ where: { userId: user.id } }),
    db.emailCode.create({
      data: { userId: user.id, codeHash: hash(code), expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60_000) },
    }),
  ]);
  await sendEmail({
    to: user.email,
    subject: `${code} is your ALLIN1 code`,
    text: `Hi ${user.name},\n\nYour ALLIN1 verification code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes.\n\nIf you didn't sign up, you can ignore this email.`,
    html: emailHtml(user.name, code),
  });
}

/** Seconds until another code can be sent (0 = now). */
export async function resendCooldown(userId: string): Promise<number> {
  const last = await db.emailCode.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
  if (!last) return 0;
  const elapsed = (Date.now() - last.createdAt.getTime()) / 1000;
  return Math.max(0, Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed));
}

export type CheckResult = "ok" | "wrong" | "expired" | "too_many";

export async function checkVerificationCode(userId: string, input: string): Promise<CheckResult> {
  const record = await db.emailCode.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
  if (!record || record.expiresAt < new Date()) return "expired";
  if (record.attempts >= MAX_ATTEMPTS) return "too_many";

  const a = Buffer.from(hash(input.replace(/\D/g, "")));
  const b = Buffer.from(record.codeHash);
  if (a.length === b.length && timingSafeEqual(a, b)) {
    await db.$transaction([
      db.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } }),
      db.emailCode.deleteMany({ where: { userId } }),
    ]);
    return "ok";
  }
  const updated = await db.emailCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
  return updated.attempts >= MAX_ATTEMPTS ? "too_many" : "wrong";
}

async function sendEmail(msg: { to: string; subject: string; text: string; html: string }) {
  const res = await fetch(process.env.RESEND_API_URL || "https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM || "ALLIN1 <onboarding@resend.dev>", ...msg }),
  });
  if (!res.ok) {
    console.error("Resend error", res.status, await res.text().catch(() => ""));
    throw new Error("Couldn't send the email");
  }
}

function emailHtml(name: string, code: string): string {
  const safeName = name.replace(/[<>&"]/g, "");
  return `<!doctype html><html><body style="margin:0;background:#06070b;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#e9ecf3">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#10131b;border:1px solid #222837;border-radius:20px;padding:32px">
<tr><td style="font-size:18px;font-weight:600">ALL<span style="color:#c4f542">IN</span>1</td></tr>
<tr><td style="padding-top:24px;font-size:15px;color:#b3bacb">Hi ${safeName}, here's your verification code:</td></tr>
<tr><td style="padding:20px 0;font-size:36px;font-weight:700;letter-spacing:10px;color:#c4f542">${code}</td></tr>
<tr><td style="font-size:13px;color:#8a93a8">It expires in ${CODE_TTL_MINUTES} minutes. If you didn't sign up for ALLIN1, you can ignore this email.</td></tr>
</table></td></tr></table></body></html>`;
}
