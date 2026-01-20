export type KPITargetType = 'channel' | 'custom' | 'team' | 'individual';

export interface KPITarget {
  id: string;
  kpi_id: string;
  target_type: string;
  target_name: string;
  target_value: number;
  current_value: number;
  unit: string;
  created_at: string;
  updated_at: string;
}

// Matches the actual kpis table in Supabase
export interface TeamKPI {
  id: string;
  title: string;
  description: string | null;
  metric_type: string;
  target: number;
  deadline: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface KPIAssignment {
  id: string;
  kpi_id: string;
  user_id: string | null;
  team_name: string | null;
  assigned_by: string;
  assigned_at: string;
  status: string | null;
  notes: string | null;
}

// Extended type for KPIs with their related data
export interface KPIWithRelations extends TeamKPI {
  targets: KPITarget[];
  assignments: KPIAssignment[];
}