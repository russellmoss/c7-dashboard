# 📱 Text Campaign System Setup Guide

## 🎯 Overview
The Text Campaign System allows you to create and manage SMS campaigns, send messages to subscribers, and handle two-way conversations. This system integrates with your existing Twilio configuration and subscriber management.

## 🚀 Features
- ✅ Create named campaigns with custom messages
- ✅ Select specific subscribers to target
- ✅ Send campaigns to multiple subscribers at once
- ✅ Archive campaigns for organization
- ✅ Receive and reply to incoming SMS messages
- ✅ Email/instant message style interface for replies
- ✅ Campaign status tracking (active/archived)
- ✅ Message history and conversation threads

## 📋 Prerequisites
1. **Twilio Account**: Ensure your Twilio number is configured
2. **Subscribers**: Have subscribers with SMS coaching enabled
3. **Webhook URL**: Configure Twilio webhook for incoming messages

## 🔧 Setup Steps

### Step 1: Configure Twilio Webhook
1. Log into your Twilio Console
2. Navigate to Phone Numbers → Manage → Active numbers
3. Click on your C7 Dashboard phone number
4. In the "Messaging" section, set the webhook URL to:
   ```
   https://your-domain.com/api/webhooks/twilio/sms
   ```
5. Set the HTTP method to POST
6. Save the configuration

### Step 2: Test the System
1. Visit your admin dashboard: `https://your-domain.com/admin`
2. Click on "📱 Text Campaigns" in the navigation
3. Test the system by visiting: `https://your-domain.com/api/admin/test-text-campaigns`
4. You should see a success message with campaign and subscriber counts

### Step 3: Create Your First Campaign
1. In the Text Campaigns page, click "New Campaign"
2. Fill in the campaign details:
   - **Campaign Name**: Give it a descriptive name
   - **Message**: Enter your SMS message (max 160 characters)
   - **Select Subscribers**: Choose which subscribers to send to
3. Click "Create Campaign"
4. Click "Send" to send the campaign immediately

## 📱 Using the Text Campaign System

### Creating Campaigns
1. **Navigate**: Go to Admin → Text Campaigns
2. **Create**: Click "New Campaign" button
3. **Configure**:
   - Name your campaign (e.g., "Weekly Update", "Special Offer")
   - Write your message (160 character limit)
   - Select subscribers with SMS coaching enabled
4. **Send**: Click "Send" to send immediately or save for later

### Managing Campaigns
- **Active Tab**: Shows campaigns that haven't been archived
- **Archived Tab**: Shows completed or archived campaigns
- **Send Button**: Sends the campaign to all selected subscribers
- **Archive Button**: Moves campaign to archived status
- **Replies Button**: Shows incoming messages and allows replies

### Handling Replies
1. **View Replies**: Click "Replies" on any campaign with incoming messages
2. **Read Messages**: See all incoming SMS messages from subscribers
3. **Send Reply**: Write a response and send to selected subscribers
4. **Mark as Read**: Messages are automatically marked as read when you reply

## 🔄 Two-Way Messaging Flow

### Outgoing Messages (Campaigns)
1. Admin creates campaign in dashboard
2. System sends SMS to selected subscribers via Twilio
3. Campaign status updated to "sent"

### Incoming Messages (Replies)
1. Subscriber sends SMS to your Twilio number
2. Twilio webhook sends message to `/api/webhooks/twilio/sms`
3. System stores message in database
4. Admin can view and reply through dashboard interface

## 📊 Campaign Management

### Campaign Status
- **Active**: Campaigns ready to send or recently sent
- **Archived**: Completed campaigns moved to archive

### Campaign Information
- **Name**: Campaign identifier
- **Message**: The SMS content sent
- **Subscribers**: Number of recipients
- **Replies**: Number of incoming responses
- **Created Date**: When campaign was created
- **Sent Date**: When campaign was sent (if sent)

## 🛠️ API Endpoints

### Campaign Management
- `GET /api/admin/text-campaigns` - List all campaigns
- `POST /api/admin/text-campaigns` - Create new campaign
- `POST /api/admin/text-campaigns/[id]/send` - Send campaign
- `PUT /api/admin/text-campaigns/[id]/archive` - Archive campaign

### Reply Management
- `POST /api/admin/text-campaigns/reply` - Send reply to subscribers

### Webhook
- `POST /api/webhooks/twilio/sms` - Receive incoming SMS messages

## 🔍 Troubleshooting

### Common Issues

**Campaigns not sending:**
- Check Twilio credentials in environment variables
- Verify subscriber phone numbers are valid
- Check SMS coaching is enabled for subscribers

**No incoming messages:**
- Verify Twilio webhook URL is correct
- Check webhook is set to POST method
- Ensure phone number is active in Twilio

**Database errors:**
- Check MongoDB connection
- Verify models are properly exported
- Check environment variables

### Testing Commands
```bash
# Test the system
curl https://your-domain.com/api/admin/test-text-campaigns

# Test webhook (simulate incoming SMS)
curl -X POST https://your-domain.com/api/webhooks/twilio/sms \
  -d "From=+1234567890" \
  -d "Body=Test message" \
  -d "To=+1987654321"
```

## 📈 Best Practices

### Campaign Creation
- Use descriptive campaign names for easy organization
- Keep messages under 160 characters
- Test with a small group before sending to all subscribers
- Archive campaigns after completion

### Message Management
- Reply promptly to incoming messages
- Use the reply interface for consistent communication
- Monitor campaign performance and engagement

### Subscriber Management
- Ensure subscribers have valid phone numbers
- Enable SMS coaching for subscribers you want to message
- Keep subscriber information up to date

## 🔐 Security Considerations

### Webhook Security
- Twilio webhook includes authentication headers
- Validate incoming requests are from Twilio
- Store sensitive data securely

### Data Privacy
- Phone numbers are stored securely
- Messages are encrypted in transit
- Access is restricted to admin users

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all prerequisites are met
3. Test the system using the test endpoints
4. Check server logs for error messages
5. Ensure Twilio account is active and properly configured

## 🎉 Success Indicators

Your text campaign system is working correctly when:
- ✅ You can create campaigns in the admin dashboard
- ✅ Campaigns send successfully to subscribers
- ✅ Incoming messages appear in the reply interface
- ✅ You can reply to subscribers through the dashboard
- ✅ Campaigns can be archived and managed

---

**Ready to start?** Visit your admin dashboard and click "📱 Text Campaigns" to begin creating your first campaign! 