// CommonJS version for scripts
const mongoose = require('mongoose');

// KPI Data Schema
const KPIDataSchema = new mongoose.Schema({
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
  }
}, {
  timestamps: true,
  collection: 'kpi_data'
});

// Compound index for efficient queries
KPIDataSchema.index({ periodType: 1, year: 1 }, { unique: true });
KPIDataSchema.index({ createdAt: -1 });

// Cron Job Log Schema
const CronJobLogSchema = new mongoose.Schema({
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
const EmailSubscriptionSchema = new mongoose.Schema({
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

// Export models
const KPIDataModel = mongoose.models.KPIData || mongoose.model('KPIData', KPIDataSchema);
const CronJobLogModel = mongoose.models.CronJobLog || mongoose.model('CronJobLog', CronJobLogSchema);
const EmailSubscriptionModel = mongoose.models.EmailSubscription || mongoose.model('EmailSubscription', EmailSubscriptionSchema);

module.exports = { KPIDataModel, CronJobLogModel, EmailSubscriptionModel };
