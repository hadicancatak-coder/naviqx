import { Suspense } from "react";
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
        {/* Apple-level liquid glass backdrop - theme-aware */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          {/* LIGHT: Clean white-to-gray base | DARK: Deep blue-gray base */}
          <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-[hsl(220,25%,10%)] dark:via-[hsl(215,22%,12%)] dark:to-[hsl(225,28%,8%)]" />
          
          {/* LIGHT: Subtle blue mesh | DARK: Deeper blue/cyan mesh */}
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-100/40 via-transparent to-cyan-50/30 dark:from-blue-600/25 dark:via-indigo-500/10 dark:to-cyan-500/20" />
          
          {/* Header shine */}
          <div className="absolute top-0 left-0 right-0 h-[350px] bg-gradient-to-b from-blue-200/30 via-sky-100/20 to-transparent blur-[60px] dark:from-blue-500/40 dark:via-cyan-400/25 dark:to-transparent" />
          
          {/* Primary orb - top right */}
          <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] rounded-full bg-gradient-to-br from-blue-200/40 via-cyan-100/30 to-sky-50/20 blur-[100px] dark:from-blue-500/50 dark:via-cyan-400/40 dark:to-indigo-500/30" />
          
          {/* Secondary orb - top left */}
          <div className="absolute top-[-15%] left-[5%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-sky-100/40 via-blue-100/30 to-transparent blur-[80px] dark:from-indigo-400/40 dark:via-blue-500/35 dark:to-transparent" />
          
          {/* Center-left orb for sidebar */}
          <div className="absolute top-[20%] left-[-10%] w-[700px] h-[700px] rounded-full bg-gradient-to-r from-blue-100/30 via-sky-50/20 to-transparent blur-[100px] dark:from-blue-600/30 dark:via-indigo-500/25 dark:to-transparent" />
          
          {/* Bottom-left orb */}
          <div className="absolute bottom-[-10%] left-[-5%] w-[900px] h-[900px] rounded-full bg-gradient-to-tr from-blue-200/30 via-sky-100/25 to-cyan-50/15 blur-[120px] dark:from-blue-600/40 dark:via-indigo-500/35 dark:to-cyan-400/20" />
          
          {/* Center orb */}
          <div className="absolute top-[40%] left-[40%] w-[700px] h-[700px] rounded-full bg-gradient-to-br from-cyan-100/25 via-blue-50/20 to-sky-50/15 blur-[100px] dark:from-cyan-400/30 dark:via-blue-400/25 dark:to-indigo-400/20" />
          
          {/* Bottom-right orb */}
          <div className="absolute bottom-[-5%] right-[5%] w-[700px] h-[700px] rounded-full bg-gradient-to-tl from-blue-100/35 via-sky-100/25 to-cyan-50/15 blur-[100px] dark:from-indigo-500/40 dark:via-blue-500/30 dark:to-cyan-400/20" />
          
          {/* Top shine overlay */}
          <div className="absolute top-0 left-[20%] w-[60%] h-[200px] bg-gradient-to-b from-white/60 via-blue-50/30 to-transparent blur-[40px] dark:from-white/10 dark:via-white/5 dark:to-transparent" />
        </div>
        <AppSidebar />
        <main className="flex-1 overflow-auto w-full relative z-10">
          {/* Semi-transparent overlay */}
          <div className="absolute inset-0 bg-background/70 z-0" />
          {/* Subtle depth glow that shows through glass surfaces */}
          <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[300px] bg-gradient-to-b from-primary/20 via-primary/10 to-transparent blur-[60px] dark:from-primary/30 dark:via-primary/15" />
            <div className="absolute bottom-0 right-0 w-[50%] h-[400px] bg-gradient-to-tl from-cyan-500/15 via-transparent to-transparent blur-[40px] dark:from-cyan-400/25" />
          </div>
          <div className="relative z-[2]">
            <TopHeader />
            <div className="pt-md px-md pb-lg page-transition">
              <Suspense fallback={<div className="min-h-[200px]" />}>
                <Outlet />
              </Suspense>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};
