import { redirect } from "next/navigation";
import { currentUser, needsVerification } from "@/lib/auth";
import { VerifyForm } from "@/components/verify-form";

export const metadata = { title: "Check your email" };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!needsVerification(user)) redirect(user.onboarded ? "/dashboard" : "/onboarding");
  const { error } = await searchParams;
  return <VerifyForm email={user.email} sendFailed={error === "send"} />;
}
