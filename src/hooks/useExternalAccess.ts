import { useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getProductionUrl } from "@/lib/utils";

export interface ExternalAccess {
  id: string;
  access_token: string;
  entity: string;
  campaign_id: string | null;
  reviewer_email: string;
  reviewer_name: string | null;
  expires_at: string | null;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
}

const generateUniqueToken = () => {
  return crypto.randomUUID();
};

export const useExternalAccess = () => {
  // Generate access link
  const generateLink = useMutation({
    mutationFn: async ({
      entity,
      reviewerName,
      reviewerEmail,
      expiresAt,
      campaignId,
    }: {
      entity: string;
      reviewerName: string;
      reviewerEmail: string;
      expiresAt?: string;
      campaignId?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const token = generateUniqueToken();
      
      const { data, error } = await supabase
        .from("campaign_external_access")
        .insert({
          access_token: token,
          entity,
          reviewer_name: reviewerName,
          reviewer_email: reviewerEmail,
          expires_at: expiresAt || null,
          created_by: user?.id,
          is_active: true,
          email_verified: false,
          campaign_id: campaignId || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        ...data,
        url: `${getProductionUrl()}/campaigns-log/review/${token}`,
      };
    },
    onSuccess: () => {
      toast.success("Review link generated");
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(error.message || "Failed to generate link");
    },
  });

  // Verify token - Works without authentication (memoized to prevent unnecessary re-renders)
  const verifyToken = useCallback(async (token: string): Promise<ExternalAccess> => {
    try {
      const { data, error } = await supabase
        .from("campaign_external_access")
        .select("*")
        .eq("access_token", token)
        .eq("is_active", true)
        .maybeSingle();
      
      if (error) {
        throw new Error(`Token verification failed: ${error.message}`);
      }
      
      if (!data) {
        throw new Error("Invalid or inactive review link");
      }
      
      // Check expiration
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        throw new Error("This review link has expired");
      }

      // Track click count and last accessed (fire-and-forget, don't block on errors)
      void supabase
        .from("campaign_external_access")
        .update({
          click_count: (data.click_count || 0) + 1,
          last_accessed_at: new Date().toISOString(),
        })
        .eq("id", data.id);
      
      return data as ExternalAccess;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      // Handle network errors specifically
      if (err.message?.includes("fetch") || err.name === "TypeError") {
        throw new Error("Network error - please check your connection");
      }
      throw err;
    }
  }, []);

  // Update verification status
  const verifyEmail = useMutation({
    mutationFn: async ({
      token,
      reviewerName,
      reviewerEmail,
    }: {
      token: string;
      reviewerName: string;
      reviewerEmail: string;
    }) => {
      const { data, error } = await supabase
        .from("campaign_external_access")
        .update({
          reviewer_name: reviewerName,
          reviewer_email: reviewerEmail,
          email_verified: true,
        })
        .eq("access_token", token)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Email verified successfully");
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(error.message || "Verification failed");
    },
  });

  return {
    generateLink,
    verifyToken,
    verifyEmail,
  };
};
