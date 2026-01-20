/**
 * Route-based prefetching for instant navigation
 * Preloads lazy-loaded page chunks on hover for zero-delay navigation
 */

// Maps routes to their dynamic import functions
const routeModules: Record<string, () => Promise<any>> = {
  '/': () => import('@/pages/Dashboard'),
  '/tasks': () => import('@/pages/Tasks'),
  '/sprints': () => import('@/pages/Sprints'),
  '/ads/search': () => import('@/pages/SearchPlanner'),
  '/ads/lp': () => import('@/pages/LpPlanner'),
  '/ads/captions': () => import('@/pages/CaptionLibrary'),
  '/utm-planner': () => import('@/pages/UtmPlanner'),
  '/web-intel': () => import('@/pages/WebIntel'),
  '/keyword-intel': () => import('@/pages/KeywordIntel'),
  '/campaigns-log': () => import('@/pages/CampaignsLog'),
  '/performance': () => import('@/pages/Performance'),
  '/knowledge': () => import('@/pages/Knowledge'),
  '/projects': () => import('@/pages/Projects'),
  '/tech-stack': () => import('@/pages/TechStack'),
  '/admin': () => import('@/pages/admin/AdminLayout'),
  '/notifications': () => import('@/pages/Notifications'),
  '/about': () => import('@/pages/About'),
  '/how-to': () => import('@/pages/HowTo'),
  '/security': () => import('@/pages/Security'),
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
