// CommonJS version for scripts
const mongoose = require('mongoose');

// KPI Data Schema
const KPIDataSchema = new mongoose.Schema({
  periodType: {
    type: String,
    enum: ['mtd', 'qtd', 'ytd', 'all-quarters', 'custom'],
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
    type: mongoose.Schema.Types.Mixed,
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
  },
  startDate: String, // For custom reports
  endDate: String    // For custom reports
}, {
  timestamps: true,
  collection: 'kpi_data'
});

// Compound index for efficient queries
// For custom reports, include startDate and endDate in the unique constraint
KPIDataSchema.index({ periodType: 1, year: 1, startDate: 1, endDate: 1 }, { 
  unique: true,
  partialFilterExpression: { periodType: 'custom' }
});
// For standard reports (mtd, qtd, ytd, all-quarters), use the original unique constraint
KPIDataSchema.index({ periodType: 1, year: 1 }, { 
  unique: true,
  partialFilterExpression: { periodType: { $in: ['mtd', 'qtd', 'ytd', 'all-quarters'] } }
});
KPIDataSchema.index({ createdAt: -1 });

// Cron Job Log Schema
const CronJobLogSchema = new mongoose.Schema({
  jobType: {
    type: String,
    enum: ['mtd', 'qtd', 'ytd', 'all-quarters', 'custom'],
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
  recordsProcessed: Number,
  startDate: String, // For custom reports
  endDate: String    // For custom reports
}, {
  timestamps: true,
  collection: 'cron_job_logs'
});

// Email Subscription Schema
const EmailSubscriptionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  subscribedReports: [{
    type: String,
    enum: ['mtd', 'qtd', 'ytd', 'all-quarters', 'custom']
  }],
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: true,
    default: 'weekly'
  },
  timeEST: {
    type: String,
    required: true,
    default: '09:00'
  },
  isActive: {
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

// Export models
const KPIDataModel = mongoose.models.KPIData || mongoose.model('KPIData', KPIDataSchema);
const CronJobLogModel = mongoose.models.CronJobLog || mongoose.model('CronJobLog', CronJobLogSchema);
const EmailSubscriptionModel = mongoose.models.EmailSubscription || mongoose.model('EmailSubscription', EmailSubscriptionSchema);

module.exports = { KPIDataModel, CronJobLogModel, EmailSubscriptionModel };
