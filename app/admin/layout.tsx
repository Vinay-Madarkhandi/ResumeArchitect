import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { RefreshSession } from "@/components/auth/RefreshSession";
import { AppHeader } from "@/components/layout/AppHeader";
import { requireAdmin } from "@/lib/admin/authorization";

export const metadata: Metadata = { title: "Administration", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireAdmin();
  return (
    <>
      <RefreshSession />
      <AppHeader email={user.email} admin />
      <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6">
        <AdminNav />
        <main className="pt-6 pb-16">{children}</main>
      </div>
    </>
  );
}
