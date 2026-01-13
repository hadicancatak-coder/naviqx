import { useAuth } from "@/hooks/useAuth";
import { NewsTicker } from "@/components/NewsTicker";
import { PerformanceMetrics } from "@/components/dashboard/PerformanceMetrics";
import { TeamPerformance } from "@/components/dashboard/TeamPerformance";
import { RecentlyCompletedTicker } from "@/components/dashboard/RecentlyCompletedTicker";
import { MyTasks } from "@/components/dashboard/MyTasks";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { SprintProgress } from "@/components/dashboard/SprintProgress";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";

export default function Dashboard() {
  const { user } = useAuth();

  const userName = user?.email ? user.email.split('@')[0] : '';
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <PageContainer>
      <PageHeader
        title={`Welcome back${userName ? `, ${userName}` : ''}!`}
        description={currentDate}
      />

      <NewsTicker />

      <PerformanceMetrics />

      <RecentlyCompletedTicker />

      <TeamPerformance />

      <SprintProgress />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        <MyTasks />
        <ActivityFeed />
      </div>
    </PageContainer>
  );
}