/**
 * Resource data prefetching utilities for instant navigation
 * Preloads Knowledge, Projects, and Tech Stack data into React Query cache
 */

import { queryClient } from './queryClient';
import { supabase } from '@/integrations/supabase/client';

// Query keys for consistency
export const KNOWLEDGE_QUERY_KEY = ['knowledge-pages'] as const;
export const PROJECTS_QUERY_KEY = ['projects'] as const;
export const TECH_STACK_QUERY_KEY = ['tech-stack-pages'] as const;
export const DASHBOARD_QUERY_KEY = ['dashboard'] as const;
export const UTM_CAMPAIGNS_QUERY_KEY = ['utm-campaigns'] as const;

// Track prefetch status to avoid duplicate requests
const prefetchInProgress = {
  knowledge: false,
  projects: false,
  techStack: false,
};

// Cache freshness threshold (30 seconds)
const CACHE_FRESH_MS = 30000;

/**
 * Check if cached data is fresh
 */
function isCacheFresh(queryKey: readonly string[]): boolean {
  const queryState = queryClient.getQueryState(queryKey);
  if (!queryState?.dataUpdatedAt) return false;
  return Date.now() - queryState.dataUpdatedAt < CACHE_FRESH_MS;
}

/**
 * Prefetch Knowledge pages data
 */
export async function prefetchKnowledgeData(): Promise<void> {
  if (prefetchInProgress.knowledge) return;
  if (isCacheFresh(KNOWLEDGE_QUERY_KEY)) return;

  prefetchInProgress.knowledge = true;

  try {
    await queryClient.prefetchQuery({
      queryKey: KNOWLEDGE_QUERY_KEY,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('knowledge_pages')
          .select('*')
          .order('order_index', { ascending: true });
        if (error) throw error;
        return data;
      },
      staleTime: 60000,
    });
  } catch (err) {
    console.error('Knowledge prefetch failed:', err);
  } finally {
    prefetchInProgress.knowledge = false;
  }
}

/**
 * Prefetch Projects data
 */
export async function prefetchProjectsData(): Promise<void> {
  if (prefetchInProgress.projects) return;
  if (isCacheFresh(PROJECTS_QUERY_KEY)) return;

  prefetchInProgress.projects = true;

  try {
    await queryClient.prefetchQuery({
      queryKey: PROJECTS_QUERY_KEY,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
      },
      staleTime: 60000,
    });
  } catch (err) {
    console.error('Projects prefetch failed:', err);
  } finally {
    prefetchInProgress.projects = false;
  }
}

/**
 * Prefetch Tech Stack pages data
 */
export async function prefetchTechStackData(): Promise<void> {
  if (prefetchInProgress.techStack) return;
  if (isCacheFresh(TECH_STACK_QUERY_KEY)) return;

  prefetchInProgress.techStack = true;

  try {
    await queryClient.prefetchQuery({
      queryKey: TECH_STACK_QUERY_KEY,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('tech_stack_pages')
          .select('*')
          .order('order_index', { ascending: true });
        if (error) throw error;
        return data;
      },
      staleTime: 60000,
    });
  } catch (err) {
    console.error('Tech Stack prefetch failed:', err);
  } finally {
    prefetchInProgress.techStack = false;
  }
}

/**
 * Prefetch all resources data at once
 */
export async function prefetchAllResourcesData(): Promise<void> {
  await Promise.all([
    prefetchKnowledgeData(),
    prefetchProjectsData(),
    prefetchTechStackData(),
  ]);
}
