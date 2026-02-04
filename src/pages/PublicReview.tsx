import { useParams } from "react-router-dom";
import { ExternalReviewPage } from "@/components/external/ExternalReviewPage";
import { SearchAdsReviewContent } from "@/components/external/SearchAdsReviewContent";
import { usePublicAccess, ResourceType } from "@/hooks/usePublicAccess";

interface PublicReviewProps {
  resourceType: ResourceType;
}

/**
 * Unified public review page for all resource types.
 * Routes to appropriate content component based on resourceType.
 */
export default function PublicReview({ resourceType }: PublicReviewProps) {
  const { token } = useParams<{ token: string }>();
  
  // Get session info for content components
  const { canComment, reviewerName } = usePublicAccess({
    token: token || '',
    resourceType,
  });

  return (
    <ExternalReviewPage resourceType={resourceType}>
      {(accessData, comments, actions) => {
        switch (resourceType) {
          case 'search_ads':
            return (
              <SearchAdsReviewContent
                accessData={accessData}
                comments={comments}
                actions={actions}
                canComment={canComment}
                reviewerName={reviewerName}
              />
            );
          
          // TODO: Add other content components as we migrate
          // case 'campaign':
          //   return <CampaignReviewContent ... />;
          // case 'knowledge':
          //   return <KnowledgeReviewContent ... />;
          // case 'project':
          //   return <ProjectReviewContent ... />;
          // case 'lp_map':
          //   return <LpMapReviewContent ... />;
          
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
