import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@watersys/db";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user: supabaseUser } } = await supabase.auth.getUser();

  if (!supabaseUser) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { email: supabaseUser.email! },
  });

  if (!dbUser || !dbUser.isActive) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar user={dbUser} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={dbUser} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
