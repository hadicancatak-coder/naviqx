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
      <div className="min-h-screen flex w-full overflow-x-hidden relative">
        {/* Apple-level liquid glass backdrop - full coverage with no pure black areas */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          {/* Base gradient - prevents any pure black, covers entire viewport */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800/95 to-slate-900 dark:from-[hsl(220,25%,10%)] dark:via-[hsl(215,22%,12%)] dark:to-[hsl(225,28%,8%)]" />
          
          {/* Full-page mesh gradient for depth */}
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 via-transparent to-cyan-500/15 dark:from-blue-600/25 dark:via-indigo-500/10 dark:to-cyan-500/20" />
          
          {/* Header gradient mesh - bright shine at top */}
          <div className="absolute top-0 left-0 right-0 h-[350px] bg-gradient-to-b from-blue-500/40 via-cyan-400/25 to-transparent blur-[60px]" />
          
          {/* Primary orb - top right, covers header area */}
          <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] rounded-full bg-gradient-to-br from-blue-500/50 via-cyan-400/40 to-indigo-500/30 blur-[100px]" />
          
          {/* Secondary orb - top left for header balance */}
          <div className="absolute top-[-15%] left-[5%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-indigo-400/40 via-blue-500/35 to-transparent blur-[80px]" />
          
          {/* Center-left orb for sidebar backdrop */}
          <div className="absolute top-[20%] left-[-10%] w-[700px] h-[700px] rounded-full bg-gradient-to-r from-blue-600/30 via-indigo-500/25 to-transparent blur-[100px]" />
          
          {/* Deep blue orb - bottom left */}
          <div className="absolute bottom-[-10%] left-[-5%] w-[900px] h-[900px] rounded-full bg-gradient-to-tr from-blue-600/40 via-indigo-500/35 to-cyan-400/20 blur-[120px]" />
          
          {/* Cyan accent orb - center */}
          <div className="absolute top-[40%] left-[40%] w-[700px] h-[700px] rounded-full bg-gradient-to-br from-cyan-400/30 via-blue-400/25 to-indigo-400/20 blur-[100px]" />
          
          {/* Indigo accent orb - bottom right */}
          <div className="absolute bottom-[-5%] right-[5%] w-[700px] h-[700px] rounded-full bg-gradient-to-tl from-indigo-500/40 via-blue-500/30 to-cyan-400/20 blur-[100px]" />
          
          {/* White shine overlay - adds premium glow effect */}
          <div className="absolute top-0 left-[20%] w-[60%] h-[200px] bg-gradient-to-b from-white/10 via-white/5 to-transparent blur-[40px]" />
        </div>
        <AppSidebar />
        <main className="flex-1 overflow-auto w-full relative z-10 bg-background">
          <TopHeader />
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
};
