export interface DashboardSchedule {
  periodType: "mtd" | "qtd" | "ytd" | "all-quarters";
  frequency:
    | "daily"
    | "weekly"
    | "biweekly"
    | "monthly"
    | "quarterly"
    | "yearly";
  timeEST: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  weekOfMonth?: number;
  weekStart?: number;
  monthOfQuarter?: number;
  monthOfYear?: number;
  isActive: boolean;
  includeMetrics: {
    wineConversionRate: boolean;
    clubConversionRate: boolean;
    goalVariance: boolean;
    overallPerformance: boolean;
  };
}

export interface StaffMemberCoaching {
  id: string;
  name: string;
  phoneNumber: string;
  enabled: boolean;
  isActive: boolean;
  dashboards: DashboardSchedule[];
}

export interface AdminCoachingConfig {
  isActive: boolean;
  includeTeamMetrics: boolean;
  includeTopPerformers: boolean;
  includeBottomPerformers: boolean;
  includeGoalComparison: boolean;
  includeManagementTips: boolean;
  dashboards: Array<{
    periodType: string;
    frequency: string;
    timeEST: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    weekOfMonth?: number;
    monthOfQuarter?: number;
    isActive: boolean;
  }>;
}

export interface SMSCoaching {
  isActive: boolean;
  phoneNumber: string;
  staffMembers: StaffMemberCoaching[];
  coachingStyle: "encouraging" | "analytical" | "motivational" | "balanced";
  customMessage?: string;
  adminCoaching?: AdminCoachingConfig;
}

export interface CoachingSMSHistory {
  _id?: string;
  staffName: string;
  phoneNumber: string;
  periodType: "mtd" | "qtd" | "ytd" | "all-quarters" | "custom";
  coachingMessage: string;
  coachingTechnique?: string;
  sentAt: Date;
}
