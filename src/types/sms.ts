export interface DashboardSchedule {
  periodType: 'mtd' | 'qtd' | 'ytd' | 'all-quarters';
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  timeEST: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  weekOfMonth?: number;
  weekStart?: number;
  monthOfQuarter?: number;
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

export interface SMSCoaching {
  isActive: boolean;
  phoneNumber: string;
  staffMembers: StaffMemberCoaching[];
  coachingStyle: 'encouraging' | 'analytical' | 'motivational' | 'balanced';
  customMessage?: string;
}

export interface CoachingSMSHistory {
  _id?: string;
  staffName: string;
  phoneNumber: string;
  periodType: 'mtd' | 'qtd' | 'ytd' | 'all-quarters' | 'custom';
  coachingMessage: string;
  coachingTechnique?: string;
  sentAt: Date;
} 