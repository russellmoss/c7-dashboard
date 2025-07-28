## Updated Implementation Plan

Based on your clarifications, here's the revised step-by-step implementation plan:

### Step 1: Update AOV Calculation in Backend Data Pipeline

```
cursor.ai prompt:
Update the backend data pipeline to add Average Order Value (AOV) calculation that excludes returns and refunds. AOV = (revenue - returns - refunds) / (orders - return_orders - refund_orders) for each staff member. Add this to the existing dashboard data structure. Update the data processing logic to:
1. Filter out orders with type 'return' or 'refund' from the order count
2. Subtract return and refund amounts from revenue
3. Calculate AOV with the filtered values
4. Handle division by zero gracefully (return 0 if filtered orders = 0)
5. Add AOV field to all dashboard types (MTD, QTD, YTD, Custom, All-Quarters)
Update all relevant TypeScript types to include the new AOV field.
```

Example implementation:
```typescript
// types/dashboard.ts
interface StaffMetrics {
  name: string;
  orders: number;
  revenue: number;
  bottleConversionRate: number;
  clubConversionRate: number;
  aov: number; // New field
  // Internal fields for calculation
  returnOrders?: number;
  refundOrders?: number;
  returnRevenue?: number;
  refundRevenue?: number;
}

// backend/dataProcessing.ts
function calculateStaffAOV(data: RawOrderData): number {
  const validOrders = data.orders.filter(o => 
    o.type !== 'return' && o.type !== 'refund'
  );
  const validRevenue = validOrders.reduce((sum, order) => sum + order.amount, 0);
  
  return validOrders.length > 0 
    ? Math.round((validRevenue / validOrders.length) * 100) / 100 
    : 0;
}
```

### Step 2: Create Competition Database Schema with Archive Support

```
cursor.ai prompt:
Create a new Mongoose schema for competitions with archive support:
- name: string (required)
- type: enum ['bottleConversion', 'clubConversion', 'aov'] (required)
- dashboard: enum ['mtd', 'qtd', 'ytd'] (required)
- prizes: { first: string, second: string, third: string }
- startDate: Date (required)
- endDate: Date (required)
- welcomeMessage: { text: string, sendAt: Date, sent: boolean }
- smsNotificationDates: Array of { scheduledAt: Date, sent: boolean }
- winnerMessageSent: boolean (default false)
- enrolledSubscribers: ObjectId[] (references to Subscriber model)
- status: enum ['draft', 'active', 'completed', 'archived']
- finalRankings: Array of { subscriberId: ObjectId, rank: number, value: number, name: string } (stored when completed)
- createdAt, updatedAt timestamps

Add indexes for status and date queries. Create corresponding TypeScript types.
```

### Step 3: Extend Subscriber Schema for Modal-Based Goal Setting

```
cursor.ai prompt:
Extend the existing Subscriber Mongoose schema to add personalized goals that can be edited from the subscriber modal:
- personalizedGoals: {
    bottleConversionRate: { value: number, enabled: boolean },
    clubConversionRate: { value: number, enabled: boolean },
    aov: { value: number, enabled: boolean }
  }

Each goal has a value and an enabled flag to track if it's been customized. Update TypeScript types and add validation:
- Conversion rates: 0-100
- AOV: positive number
- All fields optional with enabled defaulting to false
```

### Step 4: Competition Ranking Service with Tie Handling

```
cursor.ai prompt:
Create a ranking calculation service that properly handles ties:

1. Query dashboard data filtered by enrolled subscribers
2. Sort by competition metric (bottle %, club %, or AOV)
3. Assign ranks with tie handling:
   - If multiple people have same value, they get same rank
   - Next rank skips numbers (e.g., 1, 1, 3, 4, 4, 6)
4. Return array with:
   - subscriberId, name, metricValue, rank, tied (boolean)
5. Cache results with 5-minute TTL for performance
6. Special handling for AOV to ensure returns/refunds are excluded

Example output:
[
  { subscriberId: "123", name: "John", value: 0.72, rank: 1, tied: true },
  { subscriberId: "456", name: "Jane", value: 0.72, rank: 1, tied: true },
  { subscriberId: "789", name: "Bob", value: 0.65, rank: 3, tied: false }
]
```

### Step 5: Create Competition SMS Message Types

```
cursor.ai prompt:
Update the competition schema and types to support multiple SMS message types:
1. Welcome message: 
   - customText: string (admin-written message)
   - sendAt: Date | null (null means manual send)
   - sent: boolean
   - sentAt: Date | null

2. Progress notifications:
   - Array of { id: string, scheduledAt: Date, sent: boolean, sentAt: Date | null }

3. Winner announcement:
   - scheduledAt: Date (defaults to endDate + 1 hour)
   - sent: boolean
   - sentAt: Date | null

Add methods to the schema for adding/removing notification dates and tracking sent status.
```

### Step 6: Competition Management API with Archive Operations

```
cursor.ai prompt:
Create RESTful API endpoints for competition management including archive features:
1. POST /api/competitions - Create new competition
2. GET /api/competitions - List active/draft competitions
3. GET /api/competitions/archived - List archived competitions with pagination
4. GET /api/competitions/:id - Get competition details including final rankings if completed
5. PUT /api/competitions/:id - Update (only if draft)
6. DELETE /api/competitions/:id - Delete (only if draft)
7. POST /api/competitions/:id/activate - Activate competition
8. GET /api/competitions/:id/rankings - Get current rankings with tie handling
9. POST /api/competitions/:id/welcome-sms/send - Manually send welcome SMS
10. POST /api/competitions/:id/add-notification - Add new SMS notification date
11. DELETE /api/competitions/:id/notification/:notificationId - Remove notification

Implement proper tie handling in rankings (same rank for equal values).
```

### Step 7: Competition Admin UI with SMS Scheduling

```
cursor.ai prompt:
Create a competition management interface at /admin/competitions with:

1. Main list view with tabs: Active | Draft | Archived
2. Create/Edit form with:
   - Basic info: name, type, dashboard period, prizes
   - Date range pickers for start/end
   - Enrolled subscribers multi-select
   - Welcome SMS section:
     - Textarea for custom message
     - Toggle: "Send now" vs "Schedule for later"
     - DateTime picker if scheduled
   - Progress notifications section:
     - List of scheduled notifications with delete buttons
     - "Add Notification" button that adds DateTime picker
     - Each notification shows scheduled time and sent status
   - Winner announcement: checkbox to auto-send on completion

3. Competition detail view showing:
   - Live rankings with tie indicators (e.g., "T-1" for tied first place)
   - SMS history (what was sent when)
   - For archived: final rankings frozen at completion

Use existing UI components and date/time picker libraries.
```

### Step 8: Welcome SMS Implementation

```
cursor.ai prompt:
Implement welcome SMS functionality for competitions:

1. Add endpoint to manually trigger welcome SMS
2. If scheduled, create a job in the backend worker
3. Welcome SMS should:
   - Send the custom message written by admin
   - Include competition name and duration
   - List prizes for motivation
   - Only send to enrolled subscribers
   - Mark as sent after successful delivery
4. Prevent duplicate sends with sent flag
5. Log delivery status for each subscriber

Use existing Twilio integration. No Claude generation needed since message is admin-written.
```

### Step 9: Competition Progress SMS with Claude Integration

```
cursor.ai prompt:
Implement competition progress SMS notifications:

1. When notification time arrives, calculate current rankings
2. For each enrolled subscriber, generate personalized message via Claude showing:
   - Current position with tie indicator if applicable (e.g., "You're tied for 1st!")
   - Current metric value and improvement since last notification
   - Distance to next rank (e.g., "Just 2% more to reach 3rd place!")
   - Top 3 current leaders (names and values)
   - Time remaining and prize reminder
3. Claude prompt should vary tone based on:
   - Position (celebrate leaders, encourage others)
   - Improvement trajectory
   - Time remaining
4. Keep messages under 160 chars
5. Mark notification as sent after delivery

Handle errors gracefully without blocking other notifications.
```

### Step 10: Winner Announcement SMS System

```
cursor.ai prompt:
Create the competition winner announcement system:

1. Triggered automatically 1 hour after competition ends (configurable)
2. Calculate final rankings and store them permanently
3. Generate celebration message for ALL participants via Claude:
   - Announce top 3 winners with their final metrics
   - Include positive message for all participants
   - Mention final statistics (e.g., "Team averaged 15% improvement!")
   - Thank everyone for participating
4. Different message variations based on recipient:
   - Winners: Extra congratulations
   - Non-winners: Recognition of effort and improvement
5. Change competition status to 'completed' after sending
6. Store final rankings in competition document for archive

Ensure this runs exactly once per competition.
```

### Step 11: Update SMS Coaching with Personal Goals

```
cursor.ai prompt:
Modify SMS coaching to incorporate personalized goals from subscriber modal:

1. When generating coaching messages, check if subscriber has enabled personal goals
2. Update Claude prompt to include:
   - Company goals (53% bottle, 6% club)
   - Personal goals if enabled
   - Current performance
3. Message examples:
   - With personal goal: "You're at 48% bottle conversion. Company goal: 53%, Your goal: 50% - almost there!"
   - Without personal goal: "You're at 48% bottle conversion (goal: 53%)"
4. If personal goal is lower than current performance, celebrate exceeding it
5. Maintain backward compatibility for subscribers without personal goals

Update the Claude prompt template to handle both scenarios naturally.
```

### Step 12: Archive Management System

```
cursor.ai prompt:
Implement competition archive management:

1. Auto-archive competitions 90 days after completion (configurable)
2. Archived competitions:
   - Read-only in UI
   - Show final rankings frozen at completion time
   - Display all SMS history
   - Show final statistics and winner details
3. Archive list view with:
   - Search by name, date range, type
   - Pagination for large archives
   - Export to CSV functionality
4. Prevent any modifications to archived competitions
5. Add data retention policy (optional deletion after X days)

Create scheduled job to check and archive old competitions daily.
```

### Step 13: Competition Analytics Dashboard

```
cursor.ai prompt:
Add analytics view for competition performance:

1. Summary stats for active competitions:
   - Participation rate
   - Average improvement since start
   - Current leaders
2. Historical analytics for archived competitions:
   - Winner improvement percentages
   - Average participant improvement
   - Participation trends
3. Exportable reports showing:
   - Competition ROI (if prize values are monetary)
   - Performance lift during competition periods
   - Most successful competition types

Display using existing chart components and styling.
```

### Step 14: Comprehensive Testing Suite

```
cursor.ai prompt:
Create test coverage for all new features:

1. AOV calculation tests:
   - Correct filtering of returns/refunds
   - Edge cases (all returns, no orders, etc.)
2. Competition ranking tests:
   - Tie handling scenarios
   - Edge cases (single participant, all tied)
3. SMS scheduling tests:
   - Welcome message manual/scheduled
   - Multiple progress notifications
   - Winner announcement timing
4. Personal goals tests:
   - Validation ranges
   - Integration with coaching messages
5. Archive system tests:
   - Auto-archive after 90 days
   - Immutability of archived data
6. Mock all external services (Twilio, Claude)

Maintain existing test patterns and ensure type safety throughout.
```

### Step 15: Deployment and Migration Plan

```
cursor.ai prompt:
Create a safe deployment plan for Render:

1. Database migrations:
   - Add competition collection
   - Update subscriber schema with personal goals
   - Backfill AOV data for historical dashboards
2. Environment variables:
   - COMPETITION_ARCHIVE_DAYS (default: 90)
   - WINNER_ANNOUNCEMENT_DELAY_HOURS (default: 1)
3. Worker updates:
   - New job types: competition-welcome, competition-progress, competition-winner
   - Ensure job queue can handle new types
4. Deployment checklist:
   - Run migrations in staging first
   - Test with sample competition
   - Verify SMS delivery in staging
   - Plan rollback strategy
5. Monitoring additions:
   - Competition SMS delivery rates
   - Ranking calculation performance
   - Archive job success rate

Document any manual steps required during deployment.
```

This implementation plan now follows a logical testing sequence where each step can be tested independently and builds upon the previous steps without circular dependencies.