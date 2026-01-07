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
          <div className="absolute top-[-20%] right-[-10%] w-[700px] h-[700px] rounded-full bg-gradient-to-br from-blue-500/35 via-cyan-400/25 to-transparent blur-[100px]" />
          {/* Deep blue orb - bottom left */}
          <div className="absolute bottom-[-25%] left-[-15%] w-[800px] h-[800px] rounded-full bg-gradient-to-tr from-blue-600/30 via-indigo-500/20 to-transparent blur-[120px]" />
          {/* Cyan accent orb - center */}
          <div className="absolute top-[30%] left-[40%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-cyan-400/20 via-blue-400/15 to-transparent blur-[100px]" />
          {/* Indigo accent orb - bottom right */}
          <div className="absolute bottom-[10%] right-[20%] w-[400px] h-[400px] rounded-full bg-gradient-to-tl from-indigo-500/20 via-blue-500/15 to-transparent blur-[80px]" />
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
