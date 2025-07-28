export interface EmailSubscription {
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  subscribedReports: ("mtd" | "qtd" | "ytd" | "all-quarters")[];
  frequency: "daily" | "weekly" | "monthly";
  timeEST: string;
  isActive: boolean;
  reportSchedules?: {
    mtd?: { 
      frequency: string; 
      dayOfWeek?: string; 
      timeEST?: string; 
      weekStart?: string;
      isActive?: boolean;
      weekOfMonth?: number;
      monthOfQuarter?: number;
      dayOfMonth?: number;
      monthOfYear?: number;
    };
    qtd?: { 
      frequency: string; 
      dayOfWeek?: string; 
      timeEST?: string; 
      weekStart?: string;
      isActive?: boolean;
      weekOfMonth?: number;
      monthOfQuarter?: number;
      dayOfMonth?: number;
      monthOfYear?: number;
    };
    ytd?: { 
      frequency: string; 
      dayOfWeek?: string; 
      timeEST?: string; 
      weekStart?: string;
      isActive?: boolean;
      weekOfMonth?: number;
      monthOfQuarter?: number;
      dayOfMonth?: number;
      monthOfYear?: number;
    };
    "all-quarters"?: { 
      frequency: string; 
      dayOfWeek?: string; 
      timeEST?: string; 
      weekStart?: string;
      isActive?: boolean;
      weekOfMonth?: number;
      monthOfQuarter?: number;
      dayOfMonth?: number;
      monthOfYear?: number;
    };
  };
  smsCoaching?: {
    isActive: boolean;
    phoneNumber: string;
    staffMembers: Array<{
      name: string;
      dashboards: Array<{ periodType: string }>;
    }>;
    coachingStyle: string;
    customMessage: string;
  };
  personalizedGoals?: {
    bottleConversionRate?: { enabled?: boolean; value?: string | number };
    clubConversionRate?: { enabled?: boolean; value?: string | number };
    aov?: { enabled?: boolean; value?: string | number };
  };
  createdAt?: Date;
  updatedAt?: Date;
  unsubscribeToken?: string;
  admin?: boolean;
  adminPassword?: string;
}

export interface StaffMemberCoaching {
  id?: string;
  name: string;
  phoneNumber?: string;
  enabled?: boolean;
  isActive?: boolean;
  dashboards: Array<DashboardSchedule>;
}

export interface DashboardSchedule {
  periodType: string;
  frequency: string;
  timeEST: string;
  isActive: boolean;
  dayOfWeek?: string;
  weekOfMonth?: number;
  monthOfQuarter?: number;
  dayOfMonth?: number;
  monthOfYear?: number;
  weekStart?: number;
  includeMetrics?: any;
}

export interface KPIData {
  periodType: string;
  data: any;
  insights?: any;
}
