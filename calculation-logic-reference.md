# Project Types and Schemas - Milea KPI Dashboard

## TypeScript Interfaces

### Core KPI Types

```typescript
// src/types/kpi.ts

export interface KPIData {
  _id?: string;
  periodType: 'mtd' | 'qtd' | 'ytd' | 'all-quarters';
  generatedAt: string;
  year: number;
  data: {
    generatedAt: string;
    periodType: string;
    year?: number;
    definitions?: any;
    current?: PeriodData;
    previous?: PeriodData;
    yearOverYear?: YearOverYearComparison;
    quarters?: { [key: string]: QuarterData };
    quarterComparisons?: { [key: string]: YearOverYearComparison };
  };
  insights?: AIInsights;
  createdAt: Date;
  updatedAt: Date;
  executionTime?: number;
  status: 'generating' | 'completed' | 'failed';
}

export interface PeriodData {
  periodLabel: string;
  dateRange: {
    start: string;
    end: string;
  };
  overallMetrics: {
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
    wineBottleConversionGoalVariance: number;
    clubConversionGoalVariance: number;
    subTotal: number;
    shippingTotal: number;
    taxTotal: number;
    tipTotal: number;
    grandTotal: number;
  };
  guestBreakdown: { [key: string]: number };
  clubSignupBreakdown: { [key: string]: number };
  associatePerformance: { [key: string]: AssociateMetrics };
  serviceTypeAnalysis: {
    tasting: ServiceTypeMetrics;
    dining: ServiceTypeMetrics;
    byTheGlass: ServiceTypeMetrics;
    retail: ServiceTypeMetrics;
  };
  conversionFunnel: {
    guestOnlyOrders: number;
    wineOrders: number;
    mixedOrders: number;
  };
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
  bottleConversionGoalVariance?: number | string;
  clubConversionGoalVariance?: number | string;
}

export interface YearOverYearComparison {
  revenue: {
    current: number;
    previous: number;
    change: number | null;
  };
  guests: {
    current: number;
    previous: number;
    change: number | null;
  };
  orders: {
    current: number;
    previous: number;
    change: number | null;
  };
  bottlesSold: {
    current: number;
    previous: number;
    change: number | null;
  };
  avgOrderValue: {
    current: number;
    previous: number;
    change: number | null;
  };
  wineConversionRate: {
    current: number;
    previous: number;
    change: number;
    goal: number;
    goalVariance: number;
  };
  clubConversionRate: {
    current: number;
    previous: number;
    change: number;
    goal: number;
    goalVariance: number;
  };
}

export interface QuarterData {
  current: PeriodData;
  previous: PeriodData;
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
```

## MongoDB Schemas

```typescript
// src/lib/models.ts

import mongoose, { Schema, Model } from 'mongoose';

// KPI Data Schema
const KPIDataSchema = new Schema<KPIData>({
  periodType: {
    type: String,
    enum: ['mtd', 'qtd', 'ytd', 'all-quarters'],
    required: true,
    index: true
  },
  generatedAt: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true,
    index: true
  },
  data: {
    type: Schema.Types.Mixed,
    required: true
  },
  insights: {
    strengths: [String],
    opportunities: [String],
    weaknesses: [String],
    threats: [String],
    staffPraise: [{
      name: String,
      reason: String,
      metrics: [String]
    }],
    staffCoaching: [{
      name: String,
      reason: String,
      metrics: [String]
    }],
    recommendations: [String],
    generatedAt: String
  },
  executionTime: Number,
  status: {
    type: String,
    enum: ['generating', 'completed', 'failed'],
    default: 'generating'
  }
}, {
  timestamps: true,
  collection: 'kpi_data'
});

// Compound index for efficient queries
KPIDataSchema.index({ periodType: 1, year: 1 }, { unique: true });
KPIDataSchema.index({ createdAt: -1 });

// Cron Job Log Schema
const CronJobLogSchema = new Schema<CronJobLog>({
  jobType: {
    type: String,
    enum: ['mtd', 'qtd', 'ytd', 'all-quarters'],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['running', 'completed', 'failed'],
    required: true
  },
  startTime: {
    type: Date,
    required: true,
    index: true
  },
  endTime: Date,
  executionTime: Number,
  error: String,
  dataGenerated: {
    type: Boolean,
    default: false
  },
  recordsProcessed: Number
}, {
  timestamps: true,
  collection: 'cron_job_logs'
});

// Email Subscription Schema
const EmailSubscriptionSchema = new Schema<EmailSubscription>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  subscribedReports: [{
    type: String,
    enum: ['mtd', 'qtd', 'ytd', 'all-quarters']
  }],
  active: {
    type: Boolean,
    default: true
  },
  unsubscribeToken: {
    type: String,
    unique: true,
    sparse: true
  }
}, {
  timestamps: true,
  collection: 'email_subscriptions'
});
```

## API Response Types

```typescript
// API Response Types

// GET /api/kpi/[periodType] Response
interface KPIDataResponse {
  success: boolean;
  periodType: 'mtd' | 'qtd' | 'ytd' | 'all-quarters';
  data: {
    generatedAt: string;
    periodType: string;
    year?: number;
    definitions?: any;
    current?: PeriodData;
    previous?: PeriodData;
    yearOverYear?: YearOverYearComparison;
    quarters?: { [key: string]: QuarterData };
    quarterComparisons?: { [key: string]: YearOverYearComparison };
  };
  insights?: AIInsights;
  lastUpdated: Date;
  executionTime?: number;
}

// POST /api/kpi/generate Response
interface GenerateKPIResponse {
  success: boolean;
  message: string;
  estimatedTime: string;
}

// GET /api/kpi/status/[periodType] Response
interface KPIStatusResponse {
  periodType: 'mtd' | 'qtd' | 'ytd' | 'all-quarters';
  status: 'idle' | 'generating' | 'completed' | 'failed';
  progress: number | null;
  lastUpdated?: Date;
  lastGenerated?: string;
  executionTime?: number;
}

// GET /api/health Response
interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  mongodb: 'connected' | 'disconnected';
  environment: string;
  missingEnvVars: string[] | null;
  error?: string;
}

// POST /api/ai-assistant/chat Response
interface ChatResponse {
  success: boolean;
  response: string;
}

// POST /api/ai-assistant/chat Request
interface ChatRequest {
  message: string;
}

// Error Response
interface ErrorResponse {
  error: string;
}
```

## Environment Variable Types

```typescript
// Environment Variables Configuration

interface EnvironmentVariables {
  // MongoDB Configuration
  MONGODB_URI: string;
  
  // Anthropic AI Configuration
  ANTHROPIC_API_KEY: string;
  
  // Resend Email Service Configuration
  RESEND_API_KEY: string;
  
  // Commerce7 API Configuration
  C7_APP_ID: string;
  C7_API_KEY: string;
  C7_TENANT_ID: string;
  
  // Next.js Configuration
  NODE_ENV: 'development' | 'production' | 'test';
  NEXTAUTH_SECRET: string;
  NEXTAUTH_URL: string;
}

// Type-safe environment variable access
declare global {
  namespace NodeJS {
    interface ProcessEnv extends EnvironmentVariables {}
  }
}
```

## Component Props Types

```typescript
// UI Component Props

interface RefreshButtonProps {
  periodType: 'mtd' | 'qtd' | 'ytd' | 'all-quarters';
  onRefreshComplete?: () => void;
  className?: string;
}

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number | null;
  goal?: number;
  goalVariance?: number;
  icon: React.ReactNode;
}

interface RevenueChartProps {
  data: PeriodData;
}
```

## Date Range Types

```typescript
// Date Range Utilities

interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

interface DateRanges {
  current: DateRange;
  previous: DateRange;
}
```

## Constant Types

```typescript
// Application Constants

type PeriodType = 'mtd' | 'qtd' | 'ytd' | 'all-quarters';

interface EstimatedTimes {
  mtd: string;
  qtd: string;
  ytd: string;
  'all-quarters': string;
}

interface PerformanceGoals {
  wineBottleConversionRate: number;
  clubConversionRate: number;
}

interface GuestProductIds {
  [key: string]: string;
}

interface ClubNames {
  [key: string]: string;
}
```

## Commerce7 API Types

```typescript
// Commerce7 API Response Types

interface C7Order {
  id: string;
  createdAt: string;
  orderPaidDate?: string;
  orderDate?: string;
  subTotal: number;
  taxTotal: number;
  shippingTotal?: number;
  tipTotal?: number;
  items: any[];
  customer?: any;
}

interface C7ClubMembership {
  id: string;
  customerId: string;
  signupDate: string;
  clubId: string;
  status: string;
}
```

## Database Connection Types

```typescript
// MongoDB Connection Types

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}
```