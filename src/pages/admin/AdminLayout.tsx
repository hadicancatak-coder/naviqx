import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContainer, PageHeader } from "@/components/layout";
import { LayoutDashboard, Users, ShieldCheck, Activity, Database, Link2, Settings, Target, Zap } from "lucide-react";

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const currentTab = location.pathname.split('/')[2] || 'overview';

  const handleTabChange = (value: string) => {
    navigate(`/admin/${value}`);
  };

  return (
    <PageContainer>
      <PageHeader
        icon={Settings}
        title="Admin Dashboard"
        description="Manage system settings and monitor activity"
      />

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList className="flex overflow-x-auto w-full lg:w-auto bg-muted/50 gap-1 pb-1 scrollbar-none">
          <TabsTrigger value="overview" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="sprints" className="gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Sprints</span>
          </TabsTrigger>
          <TabsTrigger value="kpis" className="gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">KPIs</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Config</span>
          </TabsTrigger>
          <TabsTrigger value="external-links" className="gap-2">
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">Links</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Logs</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-section">
          <Outlet />
        </div>
      </Tabs>
    </PageContainer>
  );
}
