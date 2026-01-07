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
        {/* Decorative glass orbs for glassmorphism effect */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute bottom-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full bg-info/8 blur-[140px]" />
          <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] rounded-full bg-success/6 blur-[100px]" />
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
