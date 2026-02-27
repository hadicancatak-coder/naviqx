import { useParams } from "react-router-dom";
import { ExternalReviewPage } from "@/components/external/ExternalReviewPage";
import { SearchAdsReviewContent } from "@/components/external/SearchAdsReviewContent";
import { LpMapReviewContent } from "@/components/external/LpMapReviewContent";
import { CampaignReviewContent } from "@/components/external/CampaignReviewContent";
import { KnowledgeReviewContent } from "@/components/external/KnowledgeReviewContent";
import { ProjectReviewContent } from "@/components/external/ProjectReviewContent";
import { AppStoreReviewContent } from "@/components/external/AppStoreReviewContent";
import { usePublicAccess, ResourceType } from "@/hooks/usePublicAccess";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PhaseMilestone, PhaseTaskStats } from "@/hooks/useRoadmap";
import type { AppStoreListing } from "@/domain/app-store";

interface PublicReviewProps {
  resourceType: ResourceType;
}

// Fetch LP Map data using access link's resource_id or entity
function useLpMapData(accessData: { resource_id: string | null; entity: string | null } | null) {
  return useQuery({
    queryKey: ['lp-map-review', accessData?.resource_id, accessData?.entity],
    queryFn: async () => {
      if (!accessData) return null;

      // If we have a specific resource_id, fetch that LP map
      if (accessData.resource_id) {
        const { data: map, error } = await supabase
          .from('lp_maps')
          .select(`*, entity:system_entities(id, name)`)
          .eq('id', accessData.resource_id)
          .single();

        if (error) throw error;
        
        // Fetch sections
        const { data: mapSections } = await supabase
          .from('lp_map_sections')
          .select(`*, section:lp_sections(*)`)
          .eq('lp_map_id', map.id)
          .order('position', { ascending: true });

        interface SectionImage {
          id: string;
          url: string;
          caption?: string;
        }

        interface WebsiteLink {
          id: string;
          url: string;
          label?: string;
        }

        const transformedSections = (mapSections || []).map((ms) => ({
          ...ms,
          section: ms.section ? {
            ...ms.section,
            sample_images: (ms.section.sample_images as unknown as SectionImage[]) || [],
            website_links: (ms.section.website_links as unknown as WebsiteLink[]) || [],
          } : null,
        }));

        return { ...map, sections: transformedSections };
      }

      return null;
    },
    enabled: !!accessData,
  });
}

// Fetch Campaign data for entity-wide campaign review
function useCampaignData(accessData: { resource_id: string | null; entity: string | null } | null, resourceType: ResourceType) {
  return useQuery({
    queryKey: ['campaign-review-data', accessData?.resource_id, accessData?.entity],
    queryFn: async () => {
      if (!accessData) return { campaigns: [], versions: [] };

      let campaignIds: string[] = [];
      let campaigns: Array<{
        id: string;
        name: string;
        lp_type?: string;
        campaign_type?: string;
        landing_page?: string;
        description?: string | null;
      }> = [];

      if (accessData.resource_id) {
        // Single campaign review
        const { data: campaign, error } = await supabase
          .from("utm_campaigns")
          .select("*")
          .eq("id", accessData.resource_id)
          .single();

        if (error) throw error;
        campaigns = campaign ? [campaign] : [];
        campaignIds = campaign ? [campaign.id] : [];
      } else if (accessData.entity) {
        // Entity-wide review
        const { data: tracking, error } = await supabase
          .from("campaign_entity_tracking")
          .select("campaign_id, utm_campaigns(*)")
          .eq("entity", accessData.entity);

        if (error) throw error;
        campaigns = (tracking || [])
          .map((t) => t.utm_campaigns as typeof campaigns[0])
          .filter(Boolean);
        campaignIds = campaigns.map((c) => c.id);
      }

      // Load versions
      let versions: Array<{
        id: string;
        utm_campaign_id: string;
        version_number: number;
        version_notes: string | null;
        image_url: string | null;
        asset_link: string | null;
        created_at: string;
      }> = [];

      if (campaignIds.length > 0) {
        const { data: versionData, error: versionError } = await supabase
          .from("utm_campaign_versions")
          .select("id, utm_campaign_id, version_number, version_notes, image_url, asset_link, created_at")
          .in("utm_campaign_id", campaignIds)
          .order("version_number", { ascending: false });

        if (versionError) {
          console.error("Versions query error:", versionError);
        }
        versions = versionData || [];
      }

      return { campaigns, versions };
    },
    enabled: !!accessData && resourceType === 'campaign',
  });
}

// Fetch Knowledge page data
function useKnowledgeData(accessData: { resource_id: string | null } | null, resourceType: ResourceType) {
  return useQuery({
    queryKey: ['knowledge-review-data', accessData?.resource_id],
    queryFn: async () => {
      if (!accessData?.resource_id) return null;

      const { data, error } = await supabase
        .from("knowledge_pages")
        .select("id, title, content, icon, updated_at")
        .eq("id", accessData.resource_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!accessData?.resource_id && resourceType === 'knowledge',
  });
}

// Fetch Project data with timelines, milestones, and assignees
function useProjectData(accessData: { resource_id: string | null } | null, resourceType: ResourceType) {
  const projectQuery = useQuery({
    queryKey: ['project-review-data', accessData?.resource_id],
    queryFn: async () => {
      if (!accessData?.resource_id) return null;

      const { data, error } = await supabase
        .from("projects")
        .select("id, name, status, icon, due_date, updated_at, description")
        .eq("id", accessData.resource_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!accessData?.resource_id && resourceType === 'project',
  });

  const timelinesQuery = useQuery({
    queryKey: ['project-timelines-review', projectQuery.data?.id],
    queryFn: async () => {
      if (!projectQuery.data?.id) return [];
      const { data, error } = await supabase
        .from("project_timelines")
        .select("*")
        .eq("project_id", projectQuery.data.id)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!projectQuery.data?.id,
  });

  const phaseIds = timelinesQuery.data?.map((t) => t.id) || [];

  const milestonesQuery = useQuery({
    queryKey: ['project-milestones-review', phaseIds],
    queryFn: async () => {
      if (phaseIds.length === 0) return [];
      const { data, error } = await supabase
        .from("phase_milestones")
        .select("*")
        .in("phase_id", phaseIds)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data as PhaseMilestone[];
    },
    enabled: phaseIds.length > 0,
  });

  const taskStatsQuery = useQuery({
    queryKey: ['project-task-stats-review', projectQuery.data?.id],
    queryFn: async () => {
      if (!projectQuery.data?.id) return [];
      const { data, error } = await supabase
        .from("tasks")
        .select("id, phase_id, status")
        .eq("project_id", projectQuery.data.id)
        .not("phase_id", "is", null);

      if (error) throw error;

      const statsMap = new Map<string, PhaseTaskStats>();
      for (const task of data || []) {
        if (!task.phase_id) continue;
        const existing = statsMap.get(task.phase_id) || {
          phase_id: task.phase_id,
          total_tasks: 0,
          completed_tasks: 0,
        };
        existing.total_tasks++;
        if (task.status === "Completed") {
          existing.completed_tasks++;
        }
        statsMap.set(task.phase_id, existing);
      }
      return Array.from(statsMap.values());
    },
    enabled: !!projectQuery.data?.id,
  });

  const assigneesQuery = useQuery({
    queryKey: ['project-assignees-review', projectQuery.data?.id],
    queryFn: async () => {
      if (!projectQuery.data?.id) return [];
      const { data, error } = await supabase
        .from("project_assignees")
        .select(`id, user_id, profiles:user_id (id, name, email)`)
        .eq("project_id", projectQuery.data.id);

      if (error) throw error;
      return data;
    },
    enabled: !!projectQuery.data?.id,
  });

  return {
    project: projectQuery.data,
    timelines: timelinesQuery.data,
    milestones: milestonesQuery.data,
    taskStats: taskStatsQuery.data,
    assignees: assigneesQuery.data,
  };
}

/**
 * Unified public review page for all resource types.
 * Routes to appropriate content component based on resourceType.
 */
export default function PublicReview({ resourceType }: PublicReviewProps) {
  const { token } = useParams<{ token: string }>();
  
  // Get session info for content components
  const { canComment, reviewerName, accessData } = usePublicAccess({
    token: token || '',
    resourceType,
  });

  // Fetch LP map data if needed
  const { data: lpMapData } = useLpMapData(
    resourceType === 'lp_map' ? accessData || null : null
  );

  // Fetch campaign data if needed
  const { data: campaignData } = useCampaignData(
    resourceType === 'campaign' ? accessData || null : null,
    resourceType
  );

  // Fetch knowledge data if needed
  const { data: knowledgeData } = useKnowledgeData(
    resourceType === 'knowledge' ? accessData || null : null,
    resourceType
  );

  // Fetch project data if needed
  const projectData = useProjectData(
    resourceType === 'project' ? accessData || null : null,
    resourceType
  );

  // Fetch app store listing data if needed
  const { data: appStoreListing, isLoading: appStoreLoading } = useQuery({
    queryKey: ['app-store-review-data', accessData?.resource_id],
    queryFn: async () => {
      if (!accessData?.resource_id) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('app_store_listings') as any)
        .select('*')
        .eq('id', accessData.resource_id)
        .single();
      if (error) throw error;
      return data as AppStoreListing;
    },
    enabled: !!accessData?.resource_id && resourceType === 'app_store',
  });

  return (
    <ExternalReviewPage resourceType={resourceType}>
      {(accessDataFromShell, comments, actions) => {
        switch (resourceType) {
          case 'search_ads':
            return (
              <SearchAdsReviewContent
                accessData={accessDataFromShell}
                comments={comments}
                actions={actions}
                canComment={canComment}
                reviewerName={reviewerName}
              />
            );

          case 'lp_map':
            return (
              <LpMapReviewContent
                accessData={accessDataFromShell}
                comments={comments}
                actions={actions}
                canComment={canComment}
                reviewerName={reviewerName}
                lpMapData={lpMapData || undefined}
              />
            );

          case 'campaign':
            return (
              <CampaignReviewContent
                accessData={accessDataFromShell}
                comments={comments}
                actions={actions}
                canComment={canComment}
                reviewerName={reviewerName || ""}
                campaigns={campaignData?.campaigns || []}
                versions={campaignData?.versions || []}
              />
            );

          case 'knowledge':
            return (
              <KnowledgeReviewContent
                accessData={accessDataFromShell}
                pageData={knowledgeData}
              />
            );

          case 'project':
            return (
              <ProjectReviewContent
                accessData={accessDataFromShell}
                projectData={projectData.project}
                timelines={projectData.timelines}
                milestones={projectData.milestones}
                taskStats={projectData.taskStats}
                assignees={projectData.assignees}
              />
            );

          case 'app_store':
            return (
              <AppStoreReviewContent
                accessData={accessDataFromShell}
                listing={appStoreListing}
                isLoading={appStoreLoading}
              />
            );
          
          default:
            return (
              <div className="text-center py-16 text-muted-foreground">
                Content not available for this resource type.
              </div>
            );
        }
      }}
    </ExternalReviewPage>
  );
}
