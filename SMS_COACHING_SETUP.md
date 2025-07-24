# SMS Coaching Setup Guide

## Overview
The SMS coaching feature allows you to send personalized performance updates and AI-generated coaching messages to individual staff members via text message.

## Features
- **Personalized Performance Metrics**: Wine conversion rate, club conversion rate, goal variance
- **AI-Generated Coaching**: Personalized tips and encouragement based on performance
- **Flexible Scheduling**: Daily, weekly, or monthly SMS delivery
- **Customizable Content**: Choose which metrics to include and coaching style
- **Staff Member Selection**: Select specific staff members to receive coaching

## Setup Instructions

### 1. Install Twilio
```bash
npm install twilio
```

### 2. Environment Variables
Add these variables to your `.env.local` file:

```env
# Twilio SMS Service
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

### 3. Twilio Account Setup
1. Sign up for a Twilio account at https://www.twilio.com
2. Get your Account SID and Auth Token from the Twilio Console
3. Purchase a phone number for sending SMS
4. Add the credentials to your environment variables

### 4. Using SMS Coaching

#### In the Admin Dashboard:
1. Go to the Admin Dashboard
2. Click "Edit" on any subscription
3. Scroll down to the "SMS Coaching" section
4. Enable SMS coaching
5. Enter the phone number to receive SMS
6. Select staff members to coach
7. Choose frequency and timing
8. Select which metrics to include
9. Choose coaching style (encouraging, analytical, motivational, balanced)
10. Add optional custom message
11. Save changes

#### Available Actions:
- **Send SMS Coaching**: Send coaching messages to selected staff members
- **Test SMS**: Send a test message to verify setup

## SMS Message Format

Example SMS:
```
Hi John Smith! 📊

🍷 Wine Conversion: 15.2%
👥 Club Conversion: 8.5%
🎯 Wine Goal: +2.2%
🎯 Club Goal: +0.5%
📈 Orders: 45
👥 Guests: 120
💰 Revenue: $12,450

💡 Excellent performance! You're exceeding goals across the board. Keep leveraging your wine knowledge to drive conversions.

Keep up the great work! 🍷
```

## Coaching Styles

- **Encouraging**: Focuses on positive reinforcement and achievements
- **Analytical**: Provides data-driven insights and improvement suggestions
- **Motivational**: Inspires and energizes with motivational language
- **Balanced**: Combines encouragement with actionable feedback

## Scheduling Options

- **Daily**: Every day at specified time
- **Weekly**: Specific day of week (e.g., every Wednesday)
- **Monthly**: Specific day of month (e.g., 1st of each month)

## Troubleshooting

### SMS Not Sending
1. Check Twilio credentials in environment variables
2. Verify phone number format (include country code)
3. Check Twilio account balance
4. Review server logs for error messages

### AI Coaching Not Working
1. Verify Anthropic API key is set
2. Check API rate limits
3. Review server logs for AI service errors

### Staff Members Not Found
1. Ensure staff names match exactly with KPI data
2. Check that KPI data exists for the selected period
3. Verify staff member names in the dropdown

## Security Notes

- Phone numbers are stored securely in the database
- SMS content is generated dynamically from KPI data
- No sensitive information is included in SMS messages
- Staff members can be easily added/removed from coaching lists

## Cost Considerations

- Twilio charges per SMS sent
- AI API calls for coaching generation
- Consider frequency and number of staff members when budgeting 