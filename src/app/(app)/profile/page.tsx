import { LogOut } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { profileDefaults } from "@/lib/profile-defaults";
import { logout } from "@/app/actions/auth";
import { ProfileForm } from "@/components/profile-form";
import { Button, PageHeader } from "@/components/ui";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader
        title="Profile"
        subtitle={user.email}
        action={
          <form action={logout}>
            <Button variant="secondary" size="sm">
              <LogOut className="size-4" /> Log out
            </Button>
          </form>
        }
      />
      <ProfileForm defaults={await profileDefaults(user)} onboarding={false} />
    </>
  );
}
