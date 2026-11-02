import { logout } from "@/app/(auth)/actions";
import { Sidebar } from "@/components/sidebar";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-dvh">
      <Sidebar orgName={user.orgName} userName={user.name} role={user.role} logout={logout} />
      <main className="lg:pl-64 print:pl-0">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8 print:p-0">{children}</div>
      </main>
    </div>
  );
}
