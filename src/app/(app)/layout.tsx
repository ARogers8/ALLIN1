import { AppNav } from "@/components/app-nav";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-dvh lg:pl-64">
      <AppNav name={user.name} />
      <main className="mx-auto w-full max-w-6xl animate-fade px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">{children}</main>
    </div>
  );
}
