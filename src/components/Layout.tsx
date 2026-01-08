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
        {/* Apple-level liquid glass backdrop - layered gradient orbs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          {/* Header gradient mesh - ensures consistent glass backdrop across top */}
          <div className="absolute top-0 left-0 right-0 h-[250px] bg-gradient-to-br from-blue-500/30 via-cyan-400/20 to-indigo-500/25 blur-[80px]" />
          
          {/* Primary orb - top right, covers header area */}
          <div className="absolute top-[-5%] right-[0%] w-[700px] h-[700px] rounded-full bg-gradient-to-br from-blue-500/45 via-cyan-400/35 to-transparent blur-[90px]" />
          
          {/* Secondary orb - top left for header balance */}
          <div className="absolute top-[-10%] left-[10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-indigo-400/30 via-blue-500/25 to-transparent blur-[70px]" />
          
          {/* Deep blue orb - bottom left */}
          <div className="absolute bottom-[-20%] left-[-10%] w-[800px] h-[800px] rounded-full bg-gradient-to-tr from-blue-600/35 via-indigo-500/25 to-transparent blur-[100px]" />
          
          {/* Cyan accent orb - center */}
          <div className="absolute top-[35%] left-[35%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-cyan-400/25 via-blue-400/20 to-transparent blur-[90px]" />
          
          {/* Indigo accent orb - bottom right */}
          <div className="absolute bottom-[5%] right-[10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tl from-indigo-500/30 via-blue-500/20 to-transparent blur-[80px]" />
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
