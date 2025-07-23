export interface KPIData {
  _id?: string;
  periodType: 'mtd' | 'qtd' | 'ytd' | 'all-quarters';
  generatedAt: string;
  year: number;
  data: any; // Full JSON from script
  insights?: AIInsights;
  createdAt: Date;
  updatedAt: Date;
  executionTime?: number;
  status: 'generating' | 'completed' | 'failed';
}

export interface AIInsights {
  strengths: string[];
  opportunities: string[];
  weaknesses: string[];
  threats: string[];
  staffPraise: StaffFeedback[];
  staffCoaching: StaffFeedback[];
  recommendations: string[];
  generatedAt: string;
}

export interface StaffFeedback {
  name: string;
  reason: string;
  metrics: string[];
}

export interface CronJobLog {
  _id?: string;
  jobType: 'mtd' | 'qtd' | 'ytd' | 'all-quarters';
  status: 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  executionTime?: number;
  error?: string;
  dataGenerated?: boolean;
  recordsProcessed?: number;
}

export interface EmailSubscription {
  _id?: string;
  email: string;
  subscribedReports: ('mtd' | 'qtd' | 'ytd' | 'all-quarters')[];
  active: boolean;
  createdAt: Date;
  unsubscribeToken?: string;
}
