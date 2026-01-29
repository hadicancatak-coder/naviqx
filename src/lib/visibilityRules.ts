/**
 * PHASE 2: SITEWIDE VISIBILITY RULES SYSTEM
 * Centralized visibility configuration for all entities
 * Customize here to control what users see across the app
 */

export const VISIBILITY_RULES = {
  // TASKS
  tasks: {
    // Profile page: only show assigned tasks
    profilePage: 'assigned_only',
    
    // Tasks page: show all global + assigned private
    tasksPage: 'global_and_assigned',
    
    // Dashboard: show assigned tasks only
    dashboard: 'assigned_only',
  },
  
  // CAMPAIGNS
  campaigns: {
    visibility: 'global_and_assigned',
  },
  
  // ADS
  ads: {
    visibility: 'global_and_assigned',
  },
};

export const CHARACTER_LIMITS = {
  // Tasks
  task_title: 200,
  task_description: 2000,
  
  // Ads
  ad_headline: 30,
  ad_short_headline: 30,
  ad_long_headline: 90,
  ad_description: 90,
  ad_business_name: 25,
  ad_sitelink: 25,
  ad_callout: 25,
  ad_cta: 20,
  
  // Campaigns
  campaign_name: 100,
  campaign_description: 500,
  
  // Projects
  project_name: 200,
  project_description: 2000,
  
  // UTM
  utm_campaign_name: 100,
  utm_description: 500,
};

/** Minimal assignee shape for visibility checks */
interface VisibilityAssignee {
  user_id: string;
}

/** Minimal item shape for visibility filtering */
interface VisibilityItem {
  assignees?: VisibilityAssignee[];
  teams?: string | string[];
  visibility?: string;
}

/**
 * Filter items based on visibility rules
 */
export function filterByVisibilityRule<T extends VisibilityItem>(
  items: T[],
  rule: 'assigned_only' | 'global_and_assigned',
  userId: string,
  userTeams: string[]
): T[] {
  return items.filter(item => {
    const isDirectAssignee = item.assignees?.some((a) => a.user_id === userId);
    const taskTeams = Array.isArray(item.teams) 
      ? item.teams 
      : (typeof item.teams === 'string' ? JSON.parse(item.teams) : []);
    const isTeamMember = userTeams.some((team) => taskTeams.includes(team));
    
    if (rule === 'assigned_only') {
      // PROFILE PAGE: Only show if user is assigned OR in team
      return isDirectAssignee || isTeamMember;
    }
    
    if (rule === 'global_and_assigned') {
      // TASKS PAGE: Show global tasks + assigned private tasks
      if (item.visibility === 'private') {
        return isDirectAssignee || isTeamMember;
      }
      return true; // Show all global tasks
    }
    
    return false;
  });
}
