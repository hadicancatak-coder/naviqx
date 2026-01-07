import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { TopHeader } from "@/components/layout/TopHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useVisitTracker } from "@/hooks/useVisitTracker";

export const Layout = () => {
  const { user } = useAuth();
  
  // Track site visits for team performance scoring
  useVisitTracker(user?.id);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background overflow-x-hidden relative">
        {/* Vibrant decorative orbs for liquid glass contrast */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          {/* Primary blue orb - top right */}
          <div className="absolute top-[-20%] right-[-10%] w-[700px] h-[700px] rounded-full bg-gradient-to-br from-primary/25 via-primary/15 to-transparent blur-[100px]" />
          {/* Teal accent orb - bottom left */}
          <div className="absolute bottom-[-25%] left-[-15%] w-[800px] h-[800px] rounded-full bg-gradient-to-tr from-cyan-500/20 via-info/12 to-transparent blur-[120px]" />
          {/* Purple accent orb - center */}
          <div className="absolute top-[30%] left-[40%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-purple-500/15 via-pink-500/10 to-transparent blur-[100px]" />
          {/* Green accent orb - bottom right */}
          <div className="absolute bottom-[10%] right-[20%] w-[400px] h-[400px] rounded-full bg-gradient-to-tl from-success/15 via-emerald-500/10 to-transparent blur-[80px]" />
        </div>
        <AppSidebar />
        <main className="flex-1 overflow-auto w-full relative z-10">
          <TopHeader />
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
};
