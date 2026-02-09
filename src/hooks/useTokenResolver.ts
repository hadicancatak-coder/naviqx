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
 * First queries public_access_links by token.
 * Falls back to checking lp_maps.public_token for legacy Brief Planner links.
 * This enables the universal /r/:token URL pattern.
 */
export function useTokenResolver(token: string | undefined): TokenResolverResult {
  const query = useQuery({
    queryKey: ["token-resolver", token],
    queryFn: async (): Promise<TokenResolution> => {
      if (!token) {
        throw new Error("No token provided");
      }

      // First, check the unified public_access_links table
      const { data, error } = await supabase
        .from("public_access_links")
        .select("resource_type, is_active, expires_at, entity, resource_id")
        .eq("access_token", token)
        .maybeSingle();

      if (error) {
        throw new Error("Failed to resolve token");
      }

      // If found in public_access_links, use that
      if (data) {
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
      }

      // Fallback: Check lp_maps table for legacy Brief Planner tokens
      const { data: lpMap, error: lpMapError } = await supabase
        .from("lp_maps")
        .select("id, is_public, entity:system_entities(name)")
        .eq("public_token", token)
        .maybeSingle();

      if (lpMapError) {
        throw new Error("Failed to resolve token");
      }

      if (lpMap) {
        if (!lpMap.is_public) {
          throw new Error("This link has been deactivated");
        }

        return {
          resourceType: "lp_map" as ResourceType,
          isActive: lpMap.is_public,
          isExpired: false,
          entity: (lpMap.entity as { name: string } | null)?.name || null,
          resourceId: lpMap.id,
        };
      }

      // Token not found in any table
      throw new Error("Invalid access link");
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
