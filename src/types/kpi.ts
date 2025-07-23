export interface KPIData {
  _id?: string;
  periodType: 'mtd' | 'qtd' | 'ytd' | 'all-quarters';
  generatedAt: string;
  year: number;
  data: KPIReport;
  insights?: AIInsights;
  createdAt: Date;
  updatedAt: Date;
  executionTime?: number;
  status: 'generating' | 'completed' | 'failed';
}

export interface KPIReport {
  generatedAt: string;
  periodType: string;
  definitions: any;
  current: PeriodData;
  previous: PeriodData;
  yearOverYear: YearOverYearComparison;
}

export interface PeriodData {
  periodLabel: string;
  dateRange: {
    start: string;
    end: string;
  };
  overallMetrics: OverallMetrics;
  todayMetrics: TodayMetrics;
  guestBreakdown: { [key: string]: number };
  clubSignupBreakdown: { [key: string]: number };
  associatePerformance: { [key: string]: AssociateMetrics };
  serviceTypeAnalysis: {
    tasting: ServiceTypeMetrics;
    dining: ServiceTypeMetrics;
    byTheGlass: ServiceTypeMetrics;
    retail: ServiceTypeMetrics;
  };
  conversionFunnel: ConversionFunnel;
}

export interface OverallMetrics {
  totalRevenue: number;
  totalOrders: number;
  totalGuests: number;
  totalBottlesSold: number;
  avgOrderValue: number;
  avgGuestsPerOrder: number;
  conversionRate: number;
  wineBottleConversionRate: number;
  clubConversionRate: number;
  totalCustomersWhoSignedUpForClub: number;
  totalGuestsWhoBoughtWineBottles: number;
  totalNonClubAndTradeGuests: number;
  subTotal: number;
  shippingTotal: number;
  taxTotal: number;
  tipTotal: number;
  grandTotal: number;
  wineBottleConversionGoalVariance: number | string;
  clubConversionGoalVariance: number | string;
}

export interface TodayMetrics {
  totalRevenue: number;
  totalOrders: number;
  totalGuests: number;
  totalBottlesSold: number;
}

export interface AssociateMetrics {
  orders: number;
  guests: number;
  revenue: number;
  bottles: number;
  wineBottleSales: number;
  clubSignups: number;
  wineBottleConversionRate: number;
  clubConversionRate: number | string;
  nonClubGuests: number;
  wineBottleConversionGoalVariance: number | string;
  clubConversionGoalVariance: number | string;
}

export interface ServiceTypeMetrics {
  orders: number;
  guests: number;
  bottles: number;
  revenue: number;
  guestsWhoBoughtBottles: number;
  guestsWhoSignedUpForClub: number;
  nonClubGuests: number;
  bottleConversionRate: number;
  clubConversionRate: number;
  aov: number;
  bottleConversionGoalVariance: number | string;
  clubConversionGoalVariance: number | string;
}

export interface ConversionFunnel {
  guestOnlyOrders: number;
  wineOrders: number;
  mixedOrders: number;
}

export interface YearOverYearComparison {
  revenue: YoYMetric;
  guests: YoYMetric;
  orders: YoYMetric;
  bottlesSold: YoYMetric;
  avgOrderValue: YoYMetric;
  wineConversionRate: YoYGoalMetric;
  clubConversionRate: YoYGoalMetric;
}

export interface YoYMetric {
  current: number;
  previous: number;
  change: number | null;
}

export interface YoYGoalMetric extends YoYMetric {
  goal: number;
  goalVariance: number;
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
