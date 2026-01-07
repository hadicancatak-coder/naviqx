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
    if (path === "/" || path === "/dashboard") return "Dashboard";
    if (path === "/tasks") return "Tasks";
    if (path === "/calendar") return "Agenda";
    if (path === "/utm-planner") return "UTM Planner";
    if (path === "/knowledge") return "Knowledge";
    if (path === "/profile") return "Profile";
    if (path === "/security") return "Security";
    if (path === "/notifications") return "Notifications";
    if (path.startsWith("/ads/captions")) return "Captions";
    if (path.includes("/ads")) return "Ads";
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
        "backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.10)]",
        "transition-all duration-200",
        theme === "light" 
          ? "bg-card/70 border border-border/40" 
          : "bg-card/70 border border-border/20"
      )}
    >
      <div className="flex items-center justify-between gap-md px-md lg:px-lg py-sm">
        {/* Left Side - Sidebar trigger & Breadcrumb */}
        <div className="flex items-center gap-3">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all h-9 w-9" />
          <div className="hidden sm:flex items-center gap-xs text-body-sm">
            <span className="font-semibold text-foreground">Prisma</span>
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
