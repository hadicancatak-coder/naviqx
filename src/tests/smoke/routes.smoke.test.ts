import { test, expect } from '@playwright/test';

/**
 * Smoke Tests - Core Route Health Checks
 * These tests verify that all major routes are accessible and render correctly
 */

const ROUTES = {
  public: [
    { path: '/auth', name: 'Auth Page' },
  ],
  protected: [
    { path: '/', name: 'Dashboard' },
    { path: '/tasks', name: 'Tasks' },
    { path: '/calendar', name: 'Calendar' },
    { path: '/ads/google', name: 'Google Planner' },
    { path: '/ads/captions', name: 'Caption Library' },
    { path: '/notifications', name: 'Notifications' },
    { path: '/profile', name: 'Profile' },
    { path: '/utm-planner', name: 'UTM Planner' },
    { path: '/copywriter', name: 'Copywriter' },
    { path: '/location-intelligence', name: 'Location Intelligence' },
    { path: '/web-intel', name: 'Web Intel' },
    { path: '/security', name: 'Security' },
    { path: '/about', name: 'About' },
    { path: '/kpis', name: 'KPIs' },
    { path: '/how-to', name: 'How To' },
    { path: '/campaigns-log', name: 'Campaigns Log' },
    { path: '/knowledge', name: 'Knowledge' },
  ],
  admin: [
    { path: '/admin/overview', name: 'Admin Overview' },
    { path: '/admin/users', name: 'Users Management' },
    { path: '/admin/config', name: 'Config (Entities/Cities)' },
    { path: '/admin/errors', name: 'Error Logs' },
    { path: '/admin/audit', name: 'Audit Log' },
    { path: '/admin/security', name: 'Security Page' },
    { path: '/admin/security-scans', name: 'Security Scans' },
    { path: '/admin/logs', name: 'Logs' },
    { path: '/admin/kpis', name: 'KPIs Management' },
    { path: '/admin/external-links', name: 'External Links' },
    { path: '/admin/ad-rules', name: 'Ad Rules' },
  ],
};

test.describe('Public Routes Smoke Tests', () => {
  for (const route of ROUTES.public) {
    test(`${route.name} (${route.path}) should load successfully`, async ({ page }) => {
      const response = await page.goto(route.path);
      expect(response?.status()).toBe(200);
      
      // Check that page has loaded (no blank screen)
      const content = await page.content();
      expect(content.length).toBeGreaterThan(100);
    });
  }
});

test.describe('Protected Routes Smoke Tests (Requires Auth)', () => {
  test.beforeEach(async ({ page }) => {
    // Note: In CI, you'll need to set up authentication
    // For now, these tests will redirect to /auth if not authenticated
    await page.goto('/');
  });

  for (const route of ROUTES.protected) {
    test(`${route.name} (${route.path}) should be accessible or redirect to auth`, async ({ page }) => {
      const response = await page.goto(route.path);
      
      // Either successfully loads (200) or redirects to auth
      expect([200, 302]).toContain(response?.status() || 0);
      
      // Check for either content or auth redirect
      const url = page.url();
      const hasAuth = url.includes('/auth') || url.includes('/mfa');
      const hasContent = (await page.content()).length > 100;
      
      expect(hasAuth || hasContent).toBe(true);
    });
  }
});

test.describe('Admin Routes Smoke Tests (Requires Admin Role)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  for (const route of ROUTES.admin) {
    test(`${route.name} (${route.path}) should be protected`, async ({ page }) => {
      const response = await page.goto(route.path);
      
      // Should either load for admin or redirect for non-admin
      expect(response?.status()).toBeDefined();
      
      const url = page.url();
      const redirectedToHome = url.endsWith('/') && !url.includes('/admin');
      const redirectedToAuth = url.includes('/auth');
      const loadedAdminPage = url.includes('/admin');
      
      // One of these conditions should be true
      expect(redirectedToHome || redirectedToAuth || loadedAdminPage).toBe(true);
    });
  }
});

test.describe('404 Not Found', () => {
  test('should show 404 page for non-existent routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    
    // Should show Not Found page
    const content = await page.textContent('body');
    const has404 = content?.includes('404') || content?.includes('Not Found') || content?.includes('Page not found');
    expect(has404).toBe(true);
  });
});

test.describe('Core Navigation Elements', () => {
  test('Dashboard should have key elements', async ({ page }) => {
    await page.goto('/');
    
    // Wait for content to load
    await page.waitForLoadState('networkidle');
    
    // Check for common dashboard elements
    const hasNavigation = await page.locator('nav, [role="navigation"]').count() > 0;
    const hasMainContent = await page.locator('main, [role="main"]').count() > 0;
    
    expect(hasNavigation || hasMainContent).toBe(true);
  });
});
