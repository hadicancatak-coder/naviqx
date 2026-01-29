import type { UnsafeAny } from '@/types/unsafe';

/**
 * Route-based prefetching for instant navigation
 * Preloads lazy-loaded page chunks on hover for zero-delay navigation
 * 
 * NOTE: Eagerly loaded pages are NOT in this registry:
 * - Dashboard, Tasks, Sprints, Profile, Notifications, KPIs, CampaignsLog
 * - Projects, Knowledge, TechStack, KeywordIntel
 * - SearchPlanner, LpPlanner, UtmPlanner, Performance
 */

// Maps routes to their dynamic import functions (lazy-loaded pages only)
const routeModules: Record<string, () => Promise<UnsafeAny>> = {
  // Ads - CaptionLibrary still lazy
  '/ads/captions': () => import('@/pages/CaptionLibrary'),
  
  // Intelligence
  '/web-intel': () => import('@/pages/WebIntel'),
  
  // Admin pages (all lazy)
  '/admin': () => import('@/pages/admin/AdminLayout'),
  '/admin/users': () => import('@/pages/admin/UsersManagement'),
  '/admin/kpis': () => import('@/pages/admin/KPIsManagement'),
  '/admin/logs': () => import('@/pages/admin/Logs'),
  '/admin/config': () => import('@/pages/admin/Config'),
  '/admin/security': () => import('@/pages/admin/SecurityPage'),
  '/admin/errors': () => import('@/pages/admin/ErrorLogs'),
  '/admin/security-scans': () => import('@/pages/admin/SecurityScans'),
  '/admin/sprints': () => import('@/pages/admin/SprintsManagement'),
  '/admin/ad-rules': () => import('@/pages/admin/AdRulesManagement'),
  '/admin/external-links': () => import('@/pages/admin/ExternalLinksManagement'),
  
  // Static/info pages
  '/about': () => import('@/pages/About'),
  '/how-to': () => import('@/pages/HowTo'),
  '/security': () => import('@/pages/Security'),
  
  // Other lazy pages
  '/copywriter': () => import('@/pages/CopyWriter'),
};

// Track already-prefetched routes to avoid duplicate fetches
const prefetchedRoutes = new Set<string>();

/**
 * Prefetch a route's JavaScript chunk
 * Call this on hover/focus to preload before click
 */
export function prefetchRoute(path: string): void {
  // Skip if already prefetched
  if (prefetchedRoutes.has(path)) return;
  
  const loader = routeModules[path];
  if (loader) {
    prefetchedRoutes.add(path);
    // Trigger the dynamic import - Webpack will cache the chunk
    loader().catch(() => {
      // Remove from set if failed so we can retry
      prefetchedRoutes.delete(path);
    });
  }
}

/**
 * Check if a route has been prefetched
 */
export function isRoutePrefetched(path: string): boolean {
  return prefetchedRoutes.has(path);
}
