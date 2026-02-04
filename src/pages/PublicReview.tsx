import { useParams } from "react-router-dom";
import { ExternalReviewPage } from "@/components/external/ExternalReviewPage";
import { SearchAdsReviewContent } from "@/components/external/SearchAdsReviewContent";
import { LpMapReviewContent } from "@/components/external/LpMapReviewContent";
import { usePublicAccess, ResourceType } from "@/hooks/usePublicAccess";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
          
          // TODO: Add other content components as we migrate
          // case 'campaign':
          //   return <CampaignReviewContent ... />;
          // case 'knowledge':
          //   return <KnowledgeReviewContent ... />;
          // case 'project':
          //   return <ProjectReviewContent ... />;
          
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
