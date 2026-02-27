import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useReviewerSession } from "./useReviewerSession";
import { toast } from "sonner";

export type ResourceType = 'campaign' | 'knowledge' | 'project' | 'lp_map' | 'search_ads' | 'app_store';

export interface PublicAccessLink {
  id: string;
  access_token: string;
  resource_type: ResourceType;
  resource_id: string | null;
  entity: string | null;
  reviewer_name: string | null;
  reviewer_email: string | null;
  email_verified: boolean;
  expires_at: string | null;
  is_active: boolean;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
  click_count: number;
  last_accessed_at: string | null;
  metadata: Record<string, unknown>;
}

export interface PublicAccessComment {
  id: string;
  access_link_id: string;
  resource_type: ResourceType;
  resource_id: string | null;
  parent_id: string | null;
  reviewer_name: string;
  reviewer_email: string;
  comment_text: string;
  comment_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface UsePublicAccessOptions {
  token: string;
  resourceType: ResourceType;
}

interface SubmitCommentParams {
  commentText: string;
  commentType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Unified hook for all external/public access pages.
 * Handles token verification, click tracking, session management, and comments.
 */
export function usePublicAccess({ token, resourceType }: UsePublicAccessOptions) {
  const queryClient = useQueryClient();
  const [hasTrackedClick, setHasTrackedClick] = useState(false);
  
  // Session management for reviewer identity
  const {
    session,
    loading: sessionLoading,
    saveSession,
    hasSession,
    reviewerName,
    reviewerEmail,
  } = useReviewerSession(resourceType === 'campaign' ? 'campaign_review' : 'lp_map', token);

  // Verify token and get access data
  const {
    data: accessData,
    isLoading: accessLoading,
    error: accessError,
  } = useQuery({
    queryKey: ['public-access', token, resourceType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_access_links')
        .select('*')
        .eq('access_token', token)
        .eq('resource_type', resourceType)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      
      // If found in public_access_links, use it
      if (data) {
        // Check expiration
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          throw new Error('This access link has expired');
        }
        return data as PublicAccessLink;
      }

      // Fallback for legacy LP Map tokens stored in lp_maps table
      if (resourceType === 'lp_map') {
        const { data: lpMap, error: lpMapError } = await supabase
          .from('lp_maps')
          .select('id, name, is_public, entity_id, click_count, last_accessed_at, created_at')
          .eq('public_token', token)
          .eq('is_public', true)
          .maybeSingle();

        if (lpMapError) throw lpMapError;

        if (lpMap) {
          // Construct a compatible PublicAccessLink object
          return {
            id: lpMap.id,
            access_token: token,
            resource_type: 'lp_map',
            resource_id: lpMap.id,
            entity: null,
            is_active: lpMap.is_public,
            is_public: true,
            expires_at: null,
            created_by: null,
            created_at: lpMap.created_at,
            click_count: lpMap.click_count || 0,
            last_accessed_at: lpMap.last_accessed_at,
            metadata: {},
            reviewer_name: null,
            reviewer_email: null,
            email_verified: false,
          } as PublicAccessLink;
        }
      }

      throw new Error('Invalid or expired access link');
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Track click (fire-and-forget, once per session)
  useEffect(() => {
    if (accessData && !hasTrackedClick) {
      setHasTrackedClick(true);
      // Fire-and-forget click tracking
      void (async () => {
        try {
          // For legacy LP Map tokens, update lp_maps directly
          if (accessData.resource_type === 'lp_map' && accessData.resource_id) {
            await supabase.from('lp_maps').update({
              click_count: (accessData.click_count || 0) + 1,
              last_accessed_at: new Date().toISOString(),
            }).eq('id', accessData.resource_id);
          } else {
            // Standard click tracking via RPC
            await supabase.rpc('increment_access_link_clicks', { p_token: token });
          }
        } catch {
          // Silent fail - click tracking is best-effort
        }
      })();
    }
  }, [accessData, token, hasTrackedClick]);

  // Fetch comments for this access link
  const {
    data: comments = [],
    isLoading: commentsLoading,
  } = useQuery({
    queryKey: ['public-access-comments', accessData?.id],
    queryFn: async () => {
      if (!accessData?.id) return [];
      
      const { data, error } = await supabase
        .from('public_access_comments')
        .select('*')
        .eq('access_link_id', accessData.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as PublicAccessComment[];
    },
    enabled: !!accessData?.id,
  });

  // Submit comment mutation
  const submitCommentMutation = useMutation({
    mutationFn: async ({ commentText, commentType = 'general', resourceId, metadata = {} }: SubmitCommentParams) => {
      if (!accessData?.id) throw new Error('No valid access link');
      if (!reviewerName || !reviewerEmail) throw new Error('Please identify yourself first');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('public_access_comments') as any).insert({
        access_link_id: accessData.id,
        resource_type: resourceType,
        resource_id: resourceId || null,
        reviewer_name: reviewerName,
        reviewer_email: reviewerEmail,
        comment_text: commentText,
        comment_type: commentType,
        metadata,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-access-comments', accessData?.id] });
      toast.success('Feedback submitted');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to submit feedback';
      toast.error(message);
    },
  });

  // Identify reviewer
  const identify = useCallback(async (name: string, email: string) => {
    await saveSession(name, email);
  }, [saveSession]);

  // Determine if reviewer needs to identify
  const isIdentified = useMemo(() => {
    // If link is public and reviewer doesn't need to comment, they're "identified" enough
    if (accessData?.is_public) return true;
    return hasSession;
  }, [accessData?.is_public, hasSession]);

  // Require identification for commenting even on public links
  const canComment = hasSession;

  return {
    // Access data
    accessData,
    entity: accessData?.entity || null,
    
    // Comments
    comments,
    
    // Loading states
    isLoading: accessLoading || sessionLoading,
    isCommentsLoading: commentsLoading,
    
    // Error
    error: accessError,
    
    // Identity
    isIdentified,
    canComment,
    reviewerName,
    reviewerEmail,
    identify,
    
    // Actions
    submitComment: submitCommentMutation.mutate,
    isSubmitting: submitCommentMutation.isPending,
  };
}

// ========================================
// Link Generation Hook (for internal users)
// ========================================

interface GenerateLinkParams {
  resourceType: ResourceType;
  entity: string;
  resourceId?: string;
  reviewerName?: string;
  reviewerEmail?: string;
  expiresAt?: Date;
  isPublic?: boolean;
  metadata?: Record<string, unknown>;
}

export function usePublicAccessManagement() {
  const queryClient = useQueryClient();

  // Generate new access link
  const generateLink = useMutation({
    mutationFn: async ({
      resourceType,
      entity,
      resourceId,
      reviewerName,
      reviewerEmail,
      expiresAt,
      isPublic = false,
      metadata = {},
    }: GenerateLinkParams) => {
      // Get current user (REQUIRED for RLS)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Authentication required');

      // Generate unique token
      const token = crypto.randomUUID().replace(/-/g, '').slice(0, 24);

      // Deactivate existing links for same entity/resource_type (if entity-wide)
      if (!resourceId) {
        await supabase
          .from('public_access_links')
          .update({ is_active: false })
          .eq('entity', entity)
          .eq('resource_type', resourceType)
          .is('resource_id', null)
          .eq('is_active', true);
      }

      // Create new link with created_by for RLS
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('public_access_links') as any)
        .insert({
          access_token: token,
          resource_type: resourceType,
          resource_id: resourceId || null,
          entity,
          reviewer_name: reviewerName || null,
          reviewer_email: reviewerEmail || null,
          expires_at: expiresAt?.toISOString() || null,
          is_public: isPublic,
          is_active: true,
          created_by: user.id,
          metadata,
        })
        .select()
        .single();

      if (error) throw error;
      return data as PublicAccessLink;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-access-links'] });
    },
  });

  // Fetch all links for admin
  const { data: allLinks = [], isLoading: linksLoading } = useQuery({
    queryKey: ['public-access-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_access_links')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as PublicAccessLink[];
    },
  });

  // Toggle link active status
  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('public_access_links')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-access-links'] });
    },
  });

  // Delete link
  const deleteLink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('public_access_links')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-access-links'] });
    },
  });

  return {
    generateLink,
    allLinks,
    linksLoading,
    toggleActive,
    deleteLink,
  };
}
