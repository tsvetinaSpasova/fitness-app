import { BottomNav } from "@/components/client/bottom-nav";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 pb-20 max-w-lg mx-auto">
      {children}
      <BottomNav />
    </div>
  );
}
