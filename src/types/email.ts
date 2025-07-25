export interface EmailSubscription {
  _id?: string;
  name: string;
  email: string;
  subscribedReports: ('mtd' | 'qtd' | 'ytd' | 'all-quarters')[];
  frequency: 'daily' | 'weekly' | 'monthly';
  timeEST: string;
  isActive: boolean;
}

export interface KPIData {
  periodType: string;
  data: any;
  insights?: any;
} 