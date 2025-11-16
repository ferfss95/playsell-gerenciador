export interface Profile {
  id: string;
  full_name: string;
  avatar_initials?: string | null;
  store_id?: string | null;
  regional_id?: string | null;
  coins?: number;
  created_at: string;
  updated_at: string;
}

export interface DailyPerformance {
  id: string;
  user_id: string;
  date: string;
  sales_target: number;
  sales_current: number;
  average_ticket: number;
  nps: number;
  conversion_rate: number;
  created_at: string;
  updated_at: string;
}

export interface UserWithPerformance extends Profile {
  latest_performance?: DailyPerformance;
}

