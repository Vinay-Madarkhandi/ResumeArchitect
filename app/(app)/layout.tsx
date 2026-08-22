import { Sidebar, MobileBottomNav } from "@/components/layout/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="pb-20 md:ml-64 md:pb-0">{children}</main>
      <MobileBottomNav />
    </div>
  );
}
