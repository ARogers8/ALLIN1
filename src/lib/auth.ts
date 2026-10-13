import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";
import { SESSION_COOKIE, SESSION_DAYS, signSession, verifySession } from "./session";
import { todayKey } from "./dates";

export async function startSession(userId: string) {
  const token = await signSession(userId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export const currentUserId = cache(async (): Promise<string | null> => {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
});

export const currentUser = cache(async () => {
  const id = await currentUserId();
  if (!id) return null;
  return db.user.findUnique({ where: { id } });
});

export type AppUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>;
export type ProfiledUser = AppUser & { sex: "MALE" | "FEMALE"; birthDate: Date; heightCm: number };

/** For pages behind login: redirects to /login, or to /onboarding until the profile is complete. */
export async function requireUser(): Promise<ProfiledUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!user.onboarded || !user.sex || !user.birthDate || !user.heightCm) redirect("/onboarding");
  return user as ProfiledUser;
}

/** The user's "today", using the timezone their browser reported. */
export async function userToday(): Promise<string> {
  const tz = (await cookies()).get("tz")?.value;
  return todayKey(tz ? decodeURIComponent(tz) : undefined);
}
