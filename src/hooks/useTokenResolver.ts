import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ResourceType = "campaign" | "search_ads" | "lp_map" | "knowledge" | "project";

interface TokenResolution {
  resourceType: ResourceType;
  isActive: boolean;
  isExpired: boolean;
  entity: string | null;
  resourceId: string | null;
}

interface TokenResolverResult {
  data: TokenResolution | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Universal token resolver hook.
 * Queries public_access_links by token only and returns the resource_type.
 * This enables the universal /r/:token URL pattern.
 */
export function useTokenResolver(token: string | undefined): TokenResolverResult {
  const query = useQuery({
    queryKey: ["token-resolver", token],
    queryFn: async (): Promise<TokenResolution> => {
      if (!token) {
        throw new Error("No token provided");
      }

      const { data, error } = await supabase
        .from("public_access_links")
        .select("resource_type, is_active, expires_at, entity, resource_id")
        .eq("access_token", token)
        .maybeSingle();

      if (error) {
        throw new Error("Failed to resolve token");
      }

      if (!data) {
        throw new Error("Invalid access link");
      }

      if (!data.is_active) {
        throw new Error("This link has been deactivated");
      }

      const isExpired = data.expires_at ? new Date(data.expires_at) < new Date() : false;
      if (isExpired) {
        throw new Error("This access link has expired");
      }

      return {
        resourceType: data.resource_type as ResourceType,
        isActive: data.is_active,
        isExpired,
        entity: data.entity,
        resourceId: data.resource_id,
      };
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  };
}
