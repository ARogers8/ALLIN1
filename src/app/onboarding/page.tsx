import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { profileDefaults } from "@/lib/profile-defaults";
import { ProfileForm } from "@/components/profile-form";
import { Logo } from "@/components/ui";

export const metadata = { title: "Set up your profile" };

export default async function OnboardingPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.onboarded) redirect("/dashboard");
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-16">
      <Logo className="text-lg" />
      <div className="mt-10 mb-8 animate-rise">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Hey {user.name}, let&apos;s dial in your <span className="text-gradient">numbers</span>.
        </h1>
        <p className="mt-2 max-w-xl text-ink-400">These are used to work out exactly how much you burn. You can change them any time.</p>
      </div>
      <ProfileForm defaults={await profileDefaults(user)} onboarding />
    </div>
  );
}
