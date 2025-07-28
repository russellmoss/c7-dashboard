import mongoose, { Schema, Model } from "mongoose";
import {
  KPIData,
  CronJobLog,
  EmailSubscription,
} from "../types/kpi";
import { CoachingSMSHistory } from "../types/sms"; // type-only, no .js needed

// KPI Data Schema
const KPIDataSchema = new Schema<KPIData>(
  {
    periodType: {
      type: String,
      enum: ["mtd", "qtd", "ytd", "all-quarters", "custom"],
      required: true,
      index: true,
    },
    generatedAt: {
      type: String,
      required: true,
    },
    year: {
      type: Number,
      required: true,
      index: true,
    },
    data: {
      type: Schema.Types.Mixed,
      required: true,
    },
    insights: {
      strengths: [String],
      opportunities: [String],
      weaknesses: [String],
      threats: [String],
      staffPraise: [
        {
          name: String,
          reason: String,
          metrics: [String],
        },
      ],
      staffCoaching: [
        {
          name: String,
          reason: String,
          metrics: [String],
        },
      ],
      recommendations: [String],
      generatedAt: String,
    },
    executionTime: Number,
    status: {
      type: String,
      enum: ["generating", "completed", "failed"],
      default: "generating",
    },
    startDate: String, // For custom reports
    endDate: String, // For custom reports
  },
  {
    timestamps: true,
    collection: "kpi_data",
  },
);

// Compound index for efficient queries
// For custom reports, include startDate and endDate in the unique constraint
KPIDataSchema.index(
  { periodType: 1, year: 1, startDate: 1, endDate: 1 },
  {
    unique: true,
    partialFilterExpression: { periodType: "custom" },
  },
);
// For standard reports (mtd, qtd, ytd, all-quarters), use the original unique constraint
KPIDataSchema.index(
  { periodType: 1, year: 1 },
  {
    unique: true,
    partialFilterExpression: {
      periodType: { $in: ["mtd", "qtd", "ytd", "all-quarters"] },
    },
  },
);
KPIDataSchema.index({ createdAt: -1 });

// Cron Job Log Schema
const CronJobLogSchema = new Schema<CronJobLog>(
  {
    jobType: {
      type: String,
      enum: ["mtd", "qtd", "ytd", "all-quarters", "custom"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["running", "completed", "failed"],
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
      index: true,
    },
    endTime: Date,
    executionTime: Number,
    error: String,
    dataGenerated: {
      type: Boolean,
      default: false,
    },
    recordsProcessed: Number,
    startDate: String, // For custom reports
    endDate: String, // For custom reports
  },
  {
    timestamps: true,
    collection: "cron_job_logs",
  },
);

// Email Subscription Schema
const EmailSubscriptionSchema = new Schema<EmailSubscriptionDoc>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    subscribedReports: [
      {
        type: String,
        enum: ["mtd", "qtd", "ytd", "all-quarters", "custom"],
      },
    ],
    reportSchedules: {
      mtd: {
        frequency: {
          type: String,
          enum: [
            "daily",
            "weekly",
            "biweekly",
            "monthly",
            "quarterly",
            "yearly",
            "custom",
          ],
          default: "weekly",
        },
        timeEST: {
          type: String,
          default: "09:00",
        },
        dayOfWeek: Number, // 0-6 (Sunday-Saturday) for weekly
        dayOfMonth: Number, // 1-31 for monthly
        weekOfMonth: Number, // 1-5 for monthly (first week, second week, etc.)
        monthOfQuarter: Number, // 1-3 for quarterly
        isActive: {
          type: Boolean,
          default: true,
        },
      },
      qtd: {
        frequency: {
          type: String,
          enum: [
            "daily",
            "weekly",
            "biweekly",
            "monthly",
            "quarterly",
            "yearly",
            "custom",
          ],
          default: "monthly",
        },
        timeEST: {
          type: String,
          default: "09:00",
        },
        dayOfWeek: Number,
        dayOfMonth: Number,
        weekOfMonth: Number,
        monthOfQuarter: Number,
        isActive: {
          type: Boolean,
          default: true,
        },
      },
      ytd: {
        frequency: {
          type: String,
          enum: [
            "daily",
            "weekly",
            "biweekly",
            "monthly",
            "quarterly",
            "yearly",
            "custom",
          ],
          default: "quarterly",
        },
        timeEST: {
          type: String,
          default: "09:00",
        },
        dayOfWeek: Number,
        dayOfMonth: Number,
        weekOfMonth: Number,
        monthOfQuarter: Number,
        isActive: {
          type: Boolean,
          default: true,
        },
      },
      "all-quarters": {
        frequency: {
          type: String,
          enum: [
            "daily",
            "weekly",
            "biweekly",
            "monthly",
            "quarterly",
            "yearly",
            "custom",
          ],
          default: "monthly",
        },
        timeEST: {
          type: String,
          default: "09:00",
        },
        dayOfWeek: Number,
        dayOfMonth: Number,
        weekOfMonth: Number,
        monthOfQuarter: Number,
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    },
    smsCoaching: {
      isActive: {
        type: Boolean,
        default: false,
      },
      phoneNumber: {
        type: String,
        trim: true,
      },
      staffMembers: [
        {
          name: {
            type: String,
            required: true,
            trim: true,
          },
          isActive: {
            type: Boolean,
            default: true,
          },
          dashboards: [
            {
              periodType: {
                type: String,
                enum: ["mtd", "qtd", "ytd", "all-quarters"],
                required: true,
              },
              frequency: {
                type: String,
                enum: ["daily", "weekly", "biweekly", "monthly", "quarterly"],
                required: true,
              },
              timeEST: {
                type: String,
                default: "09:00",
              },
              dayOfWeek: Number,
              dayOfMonth: Number,
              weekOfMonth: Number,
              monthOfQuarter: Number,
              isActive: {
                type: Boolean,
                default: true,
              },
              includeMetrics: {
                wineConversionRate: {
                  type: Boolean,
                  default: true,
                },
                clubConversionRate: {
                  type: Boolean,
                  default: true,
                },
                goalVariance: {
                  type: Boolean,
                  default: true,
                },
                overallPerformance: {
                  type: Boolean,
                  default: true,
                },
              },
            },
          ],
        },
      ],
      coachingStyle: {
        type: String,
        enum: ["encouraging", "analytical", "motivational", "balanced"],
        default: "balanced",
      },
      customMessage: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    unsubscribeToken: {
      type: String,
      unique: true,
      sparse: true,
    },
    personalizedGoals: {
      bottleConversionRate: {
        value: { type: Number, min: 0, max: 100 },
        enabled: { type: Boolean, default: false },
      },
      clubConversionRate: {
        value: { type: Number, min: 0, max: 100 },
        enabled: { type: Boolean, default: false },
      },
      aov: {
        value: { type: Number, min: 0 },
        enabled: { type: Boolean, default: false },
      },
    },
  },
  {
    timestamps: true,
    collection: "email_subscriptions",
  },
);

// Coaching SMS History Schema
const CoachingSMSHistorySchema = new Schema<CoachingSMSHistory>(
  {
    staffName: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    periodType: {
      type: String,
      enum: ["mtd", "qtd", "ytd", "all-quarters", "custom"],
      required: true,
    },
    coachingMessage: {
      type: String,
      required: true,
    },
    coachingTechnique: {
      type: String,
    },
    sentAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "coaching_sms_history",
  },
);

// Scheduled Job Log Schema
const ScheduledJobLogSchema = new Schema(
  {
    jobKey: { type: String, required: true, unique: true },
    lastExecuted: { type: Date, required: true },
    jobType: { type: String, required: true }, // 'email' or 'sms'
    target: { type: String, required: true }, // e.g. email or phone number
    status: { type: String, required: true }, // 'success', 'error', etc.
    error: { type: String },
  },
  {
    timestamps: true,
    collection: "scheduled_job_logs",
  },
);

// Competition Schema and Type
export interface Competition {
  _id?: string;
  name: string;
  type: "bottleConversion" | "clubConversion" | "aov";
  competitionType: "ranking" | "target"; // New: ranking = top 3, target = hit specific goals
  dashboard: "mtd" | "qtd" | "ytd";
  prizes: { first: string; second: string; third: string };
  targetGoals?: {
    // New: for target-based competitions
    bottleConversionRate?: number;
    clubConversionRate?: number;
    aov?: number;
  };
  startDate: Date;
  endDate: Date;
  welcomeMessage: {
    customText: string;
    sendAt: Date | null; // null means manual send
    sent: boolean;
    sentAt: Date | null;
  };
  progressNotifications: Array<{
    id: string;
    scheduledAt: Date;
    sent: boolean;
    sentAt: Date | null;
  }>;
  winnerAnnouncement: {
    scheduledAt: Date; // defaults to endDate + 1 hour
    sent: boolean;
    sentAt: Date | null;
  };
  enrolledSubscribers: mongoose.Types.ObjectId[];
  status: "draft" | "active" | "completed" | "archived";
  finalRankings: {
    subscriberId: mongoose.Types.ObjectId;
    rank: number;
    value: number;
    name: string;
  }[];
  createdAt?: Date;
  updatedAt?: Date;
}

const CompetitionSchema = new Schema<Competition>(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["bottleConversion", "clubConversion", "aov"],
      required: true,
    },
    competitionType: {
      type: String,
      enum: ["ranking", "target"],
      required: true,
      default: "ranking",
    },
    dashboard: { type: String, enum: ["mtd", "qtd", "ytd"], required: true },
    prizes: {
      first: { type: String, required: true },
      second: { type: String, required: true },
      third: { type: String, required: true },
    },
    targetGoals: {
      bottleConversionRate: { type: Number, min: 0, max: 100, required: false },
      clubConversionRate: { type: Number, min: 0, max: 100, required: false },
      aov: { type: Number, min: 0, required: false },
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    welcomeMessage: {
      customText: { type: String, required: true },
      sendAt: { type: Date, required: false, default: null }, // null means manual send
      sent: { type: Boolean, default: false },
      sentAt: { type: Date, required: false, default: null },
    },
    progressNotifications: [
      {
        id: { type: String, required: true },
        scheduledAt: { type: Date, required: true },
        sent: { type: Boolean, default: false },
        sentAt: { type: Date, required: false, default: null },
      },
    ],
    winnerAnnouncement: {
      scheduledAt: { type: Date, required: true }, // defaults to endDate + 1 hour
      sent: { type: Boolean, default: false },
      sentAt: { type: Date, required: false, default: null },
    },
    enrolledSubscribers: [{ type: Schema.Types.ObjectId, ref: "Subscriber" }],
    status: {
      type: String,
      enum: ["draft", "active", "completed", "archived"],
      required: true,
    },
    finalRankings: [
      {
        subscriberId: {
          type: Schema.Types.ObjectId,
          ref: "Subscriber",
          required: true,
        },
        rank: { type: Number, required: true },
        value: { type: Number, required: true },
        name: { type: String, required: true },
      },
    ],
  },
  {
    timestamps: true,
    collection: "competitions",
  },
);

CompetitionSchema.index({ status: 1 });
CompetitionSchema.index({ startDate: 1, endDate: 1 });

// Add methods to the schema for managing notifications
CompetitionSchema.methods.addProgressNotification = function (
  scheduledAt: Date,
) {
  const notificationId = new mongoose.Types.ObjectId().toString();
  this.progressNotifications.push({
    id: notificationId,
    scheduledAt,
    sent: false,
    sentAt: null,
  });
  return notificationId;
};

CompetitionSchema.methods.removeProgressNotification = function (
  notificationId: string,
) {
  this.progressNotifications = this.progressNotifications.filter(
    (notification: any) => notification.id !== notificationId,
  );
};

CompetitionSchema.methods.markNotificationSent = function (
  notificationId: string,
) {
  const notification = this.progressNotifications.find(
    (n: any) => n.id === notificationId,
  );
  if (notification) {
    notification.sent = true;
    notification.sentAt = new Date();
  }
};

CompetitionSchema.methods.markWelcomeMessageSent = function () {
  this.welcomeMessage.sent = true;
  this.welcomeMessage.sentAt = new Date();
};

CompetitionSchema.methods.markWinnerAnnouncementSent = function () {
  this.winnerAnnouncement.sent = true;
  this.winnerAnnouncement.sentAt = new Date();
};

// Extend EmailSubscription interface
export interface EmailSubscriptionDoc {
  name: string;
  email: string;
  subscribedReports: string[];
  reportSchedules: {
    mtd: {
      frequency: string;
      timeEST: string;
      dayOfWeek: number;
      dayOfMonth: number;
      weekOfMonth: number;
      monthOfQuarter: number;
      isActive: boolean;
    };
    qtd: {
      frequency: string;
      timeEST: string;
      dayOfWeek: number;
      dayOfMonth: number;
      weekOfMonth: number;
      monthOfQuarter: number;
      isActive: boolean;
    };
    ytd: {
      frequency: string;
      timeEST: string;
      dayOfWeek: number;
      dayOfMonth: number;
      weekOfMonth: number;
      monthOfQuarter: number;
      isActive: boolean;
    };
    "all-quarters": {
      frequency: string;
      timeEST: string;
      dayOfWeek: number;
      dayOfMonth: number;
      weekOfMonth: number;
      monthOfQuarter: number;
      isActive: boolean;
    };
  };
  smsCoaching: {
    isActive: boolean;
    phoneNumber: string;
    staffMembers: {
      name: string;
      isActive: boolean;
      dashboards: {
        periodType: string;
        frequency: string;
        timeEST: string;
        dayOfWeek: number;
        dayOfMonth: number;
        weekOfMonth: number;
        monthOfQuarter: number;
        isActive: boolean;
        includeMetrics: {
          wineConversionRate: boolean;
          clubConversionRate: boolean;
          goalVariance: boolean;
          overallPerformance: boolean;
        };
      }[];
    }[];
    coachingStyle: string;
    customMessage: string;
  };
  isActive: boolean;
  unsubscribeToken: string;
  personalizedGoals?: {
    bottleConversionRate?: { value?: number; enabled?: boolean };
    clubConversionRate?: { value?: number; enabled?: boolean };
    aov?: { value?: number; enabled?: boolean };
  };
}



// Export models with proper typing
export const KPIDataModel: Model<KPIData> =
  mongoose.models.KPIData || mongoose.model("KPIData", KPIDataSchema);
export const CronJobLogModel: Model<CronJobLog> =
  mongoose.models.CronJobLog || mongoose.model("CronJobLog", CronJobLogSchema);
export const EmailSubscriptionModel: Model<EmailSubscription> =
  mongoose.models.EmailSubscription ||
  mongoose.model("EmailSubscription", EmailSubscriptionSchema);
export const CoachingSMSHistoryModel: Model<CoachingSMSHistory> =
  mongoose.models.CoachingSMSHistory ||
  mongoose.model("CoachingSMSHistory", CoachingSMSHistorySchema);
export const ScheduledJobLogModel =
  mongoose.models.ScheduledJobLog ||
  mongoose.model("ScheduledJobLog", ScheduledJobLogSchema);
export const CompetitionModel: Model<Competition> =
  mongoose.models.Competition ||
  mongoose.model("Competition", CompetitionSchema);
