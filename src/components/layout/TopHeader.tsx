import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { UserMenu } from "@/components/UserMenu";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

export function TopHeader() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  // Get current page name for breadcrumb
  const getPageName = () => {
    const path = location.pathname;
    
    // Core
    if (path === "/" || path === "/dashboard") return "Dashboard";
    if (path === "/tasks") return "Tasks";
    if (path === "/sprints") return "Sprints";
    if (path === "/calendar") return "Agenda";
    
    // Ads - specific paths first
    if (path === "/ads/search") return "Search Planner";
    if (path === "/ads/lp") return "Brief Planner";
    if (path.startsWith("/ads/captions")) return "Captions";
    if (path === "/utm-planner") return "UTM Planner";
    if (path.includes("/ads")) return "Ads";
    
    // Intelligence
    if (path === "/web-intel") return "Web Intel";
    if (path === "/keyword-intel") return "Keyword Intel";
    
    // Operations
    if (path === "/campaigns-log") return "Campaigns Log";
    if (path === "/performance") return "Performance";
    if (path === "/kpis") return "KPIs";
    
    // Resources
    if (path === "/knowledge") return "Knowledge";
    if (path === "/projects") return "Projects";
    if (path === "/tech-stack") return "Tech Stack";
    
    // Other
    if (path === "/copywriter") return "Copywriter";
    if (path === "/profile") return "Profile";
    if (path === "/security") return "Security";
    if (path === "/notifications") return "Notifications";
    if (path.startsWith("/admin")) return "Admin";
    if (path === "/how-to") return "How To";
    if (path === "/about") return "About";
    
    return null;
  };

  const pageName = getPageName();

  return (
    <header 
      className={cn(
        "sticky top-0 z-sticky mx-md mt-md rounded-xl",
        "liquid-glass transition-all duration-200",
        "relative overflow-hidden"
      )}
    >
      {/* Self-contained gradient backdrop for liquid glass effect */}
      <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/25 via-cyan-400/20 to-indigo-500/25 dark:from-blue-500/30 dark:via-cyan-400/25 dark:to-indigo-500/30" />
        <div className="absolute -top-1/2 -left-1/4 w-[60%] h-[200%] rounded-full bg-gradient-to-br from-blue-400/30 via-cyan-300/20 to-transparent blur-2xl dark:from-blue-500/35 dark:via-cyan-400/25" />
        <div className="absolute -top-1/2 -right-1/4 w-[60%] h-[200%] rounded-full bg-gradient-to-bl from-indigo-400/30 via-blue-300/20 to-transparent blur-2xl dark:from-indigo-500/35 dark:via-blue-400/25" />
        <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/30" />
      </div>
      <div className="flex items-center justify-between gap-md px-md lg:px-lg py-sm">
        {/* Left Side - Sidebar trigger & Breadcrumb */}
        <div className="flex items-center gap-sm">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all h-9 w-9" />
          <div className="hidden sm:flex items-center gap-xs text-body-sm">
            <span className="font-semibold text-foreground">Naviqx</span>
            {pageName && (
              <>
                <span className="text-muted-foreground">/</span>
                <span className="text-muted-foreground">{pageName}</span>
              </>
            )}
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right Side Actions */}
        <div className="flex items-center gap-xs">
          {/* Theme Switcher */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className={cn(
              "h-9 w-9 rounded-full transition-all",
              "hover:bg-muted"
            )}
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            {theme === "light" ? (
              <Moon className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Sun className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>

          {/* Notifications */}
          <NotificationBell />

          {/* User Avatar */}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
