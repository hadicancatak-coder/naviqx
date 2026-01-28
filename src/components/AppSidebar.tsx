import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { 
  CheckSquare,
  LogOut, 
  Megaphone, 
  Target, 
  Link2, 
  PenTool, 
  Tv,
  BookOpen,
  Server,
  BarChart3,
  Search,
  FolderKanban,
  Zap
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import logoImage from "@/assets/cfi-logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { prefetchRoute } from "@/lib/routePrefetch";
import { prefetchTasksData } from "@/lib/taskPrefetch";
import { 
  prefetchKnowledgeData, 
  prefetchProjectsData, 
  prefetchTechStackData,
  prefetchCampaignTrackingData,
  prefetchKPIsData,
} from "@/lib/resourcesPrefetch";

  const coreItems = [
    { title: "Tasks", url: "/tasks", icon: CheckSquare },
    { title: "Sprints", url: "/sprints", icon: Zap },
  ];

const adsItems = [
  { title: "Search Planner", url: "/ads/search", icon: Megaphone },
  { title: "LP Planner", url: "/ads/lp", icon: Target },
  { title: "Caption Library", url: "/ads/captions", icon: PenTool },
  { title: "UTM Planner", url: "/utm-planner", icon: Link2 },
];


const mediaItems = [
  { title: "Web Intel", url: "/web-intel", icon: Tv },
  { title: "Keyword Intel", url: "/keyword-intel", icon: Search },
];

const operationsItems = [
  { title: "Campaigns Log", url: "/campaigns-log", icon: Target },
  { title: "Performance", url: "/performance", icon: BarChart3 },
];

const resourcesItems = [
  { title: "Knowledge", url: "/knowledge", icon: BookOpen },
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "Tech Stack", url: "/tech-stack", icon: Server },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const { open } = useSidebar();
  const { signOut, user } = useAuth();
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("name")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.name) {
            setUserName(data.name);
          } else {
            setUserName(user.user_metadata?.name || user.email?.split('@')[0] || "User");
          }
        });
    }
  }, [user]);

  // eslint-disable-next-line no-restricted-syntax -- Sidebar nav requires conditional layout classes
  const getNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? `flex items-center ${open ? 'gap-sm px-sm border-l-4 border-primary ml-[-4px]' : 'justify-center px-0 border-l-4 border-primary ml-[-4px]'} py-sm text-primary font-medium transition-smooth`
      : `flex items-center ${open ? 'gap-sm px-sm border-l-4 border-transparent ml-[-4px]' : 'justify-center px-0'} py-sm text-sidebar-foreground hover:text-primary hover:border-l-primary/20 transition-smooth`;

  return (
    <TooltipProvider delayDuration={0}>
      <Sidebar collapsible="icon" className="border-r-0">
        {/* eslint-disable-next-line no-restricted-syntax -- Sidebar requires dynamic layout spacing */}
        <SidebarContent className={`overflow-y-auto sidebar-scroll ${open ? 'px-md py-xl space-y-xl' : 'px-xs py-lg space-y-lg'}`}>
          {/* Logo and User Section - Clickable to navigate to Dashboard */}
          {/* eslint-disable-next-line no-restricted-syntax -- Sidebar section layout */}
          <div 
            onClick={() => navigate('/')}
            className={`flex ${open ? 'items-center gap-sm px-sm pb-lg border-b border-sidebar-border' : 'flex-col items-center justify-center pb-md border-b border-sidebar-border'} transition-smooth cursor-pointer hover:opacity-80`}
          >
            <img 
              src={logoImage} 
              alt="Naviqx" 
              className={`transition-smooth ${open ? 'h-10' : 'h-8'}`}
            />
            {open && (
              <div className="flex flex-col">
                <span className="text-section-title text-foreground font-semibold">Naviqx</span>
                {userName && (
                  <span className="text-metadata text-muted-foreground mt-0.5">
                    {userName}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Core Features */}
          <SidebarGroup>
            {/* eslint-disable-next-line no-restricted-syntax -- Sidebar section layout */}
            {open && <SidebarGroupLabel className="text-metadata text-muted-foreground uppercase tracking-wider px-sm mb-sm">Core</SidebarGroupLabel>}
            <SidebarMenu className="space-y-xs">
              {coreItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end 
                      className={getNavLinkClass}
                      onMouseEnter={() => {
                        prefetchRoute(item.url);
                        // Prefetch task data on Tasks hover for instant loading
                        if (item.url === '/tasks') {
                          prefetchTasksData();
                        }
                      }}
                      onFocus={() => {
                        prefetchRoute(item.url);
                        if (item.url === '/tasks') {
                          prefetchTasksData();
                        }
                      }}
                    >
                      <item.icon className="h-5 w-5 shrink-0" strokeWidth={2.5} />
                      {open && <span className="text-body">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>

          {/* Ads */}
          <SidebarGroup>
            {/* eslint-disable-next-line no-restricted-syntax -- Sidebar section layout */}
            {open && <SidebarGroupLabel className="text-metadata text-muted-foreground uppercase tracking-wider px-sm mb-sm">Ads</SidebarGroupLabel>}
            <SidebarMenu className="space-y-xs">
              {adsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={getNavLinkClass}
                      onMouseEnter={() => prefetchRoute(item.url)}
                      onFocus={() => prefetchRoute(item.url)}
                    >
                      <item.icon className="h-5 w-5 shrink-0" strokeWidth={2.5} />
                      {open && <span className="text-body">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>

          {/* Intelligence */}
          <SidebarGroup>
            {/* eslint-disable-next-line no-restricted-syntax -- Sidebar section layout */}
            {open && <SidebarGroupLabel className="text-metadata text-muted-foreground uppercase tracking-wider px-sm mb-sm">Intelligence</SidebarGroupLabel>}
            <SidebarMenu className="space-y-xs">
              {mediaItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={getNavLinkClass}
                      onMouseEnter={() => prefetchRoute(item.url)}
                      onFocus={() => prefetchRoute(item.url)}
                    >
                      <item.icon className="h-5 w-5 shrink-0" strokeWidth={2.5} />
                      {open && <span className="text-body">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>

          {/* Operations */}
          <SidebarGroup>
            {/* eslint-disable-next-line no-restricted-syntax -- Sidebar section layout */}
            {open && <SidebarGroupLabel className="text-metadata text-muted-foreground uppercase tracking-wider px-sm mb-sm">Operations</SidebarGroupLabel>}
            <SidebarMenu className="space-y-xs">
              {operationsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={getNavLinkClass}
                      onMouseEnter={() => {
                        prefetchRoute(item.url);
                        if (item.url === '/campaigns-log') prefetchCampaignTrackingData();
                        if (item.url === '/performance') prefetchKPIsData();
                      }}
                      onFocus={() => {
                        prefetchRoute(item.url);
                        if (item.url === '/campaigns-log') prefetchCampaignTrackingData();
                        if (item.url === '/performance') prefetchKPIsData();
                      }}
                    >
                      <item.icon className="h-5 w-5 shrink-0" strokeWidth={2.5} />
                      {open && <span className="text-body">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>

          {/* Resources */}
          <SidebarGroup>
            {/* eslint-disable-next-line no-restricted-syntax -- Sidebar section layout */}
            {open && <SidebarGroupLabel className="text-metadata text-muted-foreground uppercase tracking-wider px-sm mb-sm">Resources</SidebarGroupLabel>}
            <SidebarMenu className="space-y-xs">
              {resourcesItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={getNavLinkClass}
                      onMouseEnter={() => {
                        prefetchRoute(item.url);
                        // Prefetch resource data for instant loading
                        if (item.url === '/knowledge') prefetchKnowledgeData();
                        if (item.url === '/projects') prefetchProjectsData();
                        if (item.url === '/tech-stack') prefetchTechStackData();
                      }}
                      onFocus={() => {
                        prefetchRoute(item.url);
                        if (item.url === '/knowledge') prefetchKnowledgeData();
                        if (item.url === '/projects') prefetchProjectsData();
                        if (item.url === '/tech-stack') prefetchTechStackData();
                      }}
                    >
                      <item.icon className="h-5 w-5 shrink-0" strokeWidth={2.5} />
                      {open && <span className="text-body">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>

          {/* Sign Out */}
          {/* eslint-disable-next-line no-restricted-syntax -- Sidebar section layout */}
          <SidebarMenu className={`${open ? 'mt-auto pt-lg border-t border-sidebar-border' : 'mt-auto pt-md border-t border-sidebar-border flex justify-center'}`}>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                {!open ? (
                  <button
                    onClick={signOut}
                    className="flex items-center justify-center py-sm text-sidebar-foreground hover:text-destructive transition-smooth border-l-4 border-transparent hover:border-destructive ml-[-4px]"
                  >
                    <LogOut className="h-5 w-5 shrink-0" strokeWidth={2.5} />
                  </button>
                ) : (
                  <button
                    onClick={signOut}
                    className="flex items-center gap-sm px-sm py-sm text-sidebar-foreground hover:text-destructive transition-smooth w-full border-l-4 border-transparent hover:border-destructive ml-[-4px]"
                  >
                    <LogOut className="h-5 w-5 shrink-0" strokeWidth={2.5} />
                    <span className="text-body">Sign Out</span>
                  </button>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
    </TooltipProvider>
  );
}
