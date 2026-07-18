export interface DailyStat {
  date: string;
  created: number;
  completed: number;
  deleted: number;
  expired: number;
  completion_rate: number;
}

export interface WeeklyStat {
  week: string;
  created: number;
  completed: number;
  deleted: number;
  expired: number;
  completion_rate: number;
}

export interface MonthlyStat {
  month: string;
  created: number;
  completed: number;
  deleted: number;
  expired: number;
  completion_rate: number;
}

export interface Summary {
  tasks_created: number;
  tasks_completed: number;
  tasks_deleted: number;
  tasks_expired: number;
  priority_low: number;
  priority_medium: number;
  priority_high: number;
  priority_urgent: number;
  completion_rate: number;
  avg_completion_hours: number;
}

export interface Streaks {
  current: number;
  longest: number;
  cold_days?: number;
  status?: "active" | "cold" | "broken";
}

export interface DistributionItem {
  name: string;
  value: number;
  color: string;
}

export interface TrendPoint {
  x: string;
  created: number;
  completed: number;
  rate: number;
}

export interface Overview {
  total: number;
  completed: number;
  active: number;
  deleted: number;
  overdue: number;
  completion_rate: number;
}

export interface PriorityDistribution {
  low: number;
  medium: number;
  high: number;
  urgent: number;
}

export interface AnalyticsResponse {
  overview?: Overview;
  priority_distribution?: PriorityDistribution;
  streaks?: Streaks;
  charts?: {
    distribution: {
      by_priority: DistributionItem[];
      by_status: DistributionItem[];
    };
  };
  daily?: DailyStat[];
  weekly?: WeeklyStat[];
  monthly?: MonthlyStat[];
  summary?: Summary;
  completion_trend?: TrendPoint[];
  weekly_trend?: TrendPoint[];
  monthly_trend?: TrendPoint[];
}
