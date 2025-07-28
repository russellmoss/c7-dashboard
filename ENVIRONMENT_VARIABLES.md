# Environment Variables Documentation

## Required Environment Variables

### Database

- `MONGODB_URI` - MongoDB connection string (required)
- `DATABASE_URL` - Alternative MongoDB connection string (fallback)

### SMS Service (Twilio)

- `TWILIO_ACCOUNT_SID` - Twilio Account SID (required for SMS)
- `TWILIO_AUTH_TOKEN` - Twilio Auth Token (required for SMS)
- `TWILIO_PHONE_NUMBER` - Twilio phone number for sending SMS (required for SMS)

### Email Service (Resend)

- `RESEND_API_KEY` - Resend API key for sending emails (required for email reports)

### AI Service (Anthropic/Claude)

- `ANTHROPIC_API_KEY` - Anthropic API key for Claude AI insights (required for AI features)

### Security

- `JWT_SECRET` - Secret key for JWT token generation (required for authentication)

### Application

- `NODE_ENV` - Environment (development/production, defaults to development)
- `PORT` - Port for the application (defaults to 3000 for web, 3001 for worker)

## Environment Variables by Feature

### Core Application

```
NODE_ENV=production
PORT=3000
```

### Database

```
MONGODB_URI=mongodb+srv://[username]:[password]@[cluster].mongodb.net/[database]
```

### SMS Functionality

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

### Email Functionality

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### AI Insights

```
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Security

```
JWT_SECRET=your-super-secret-jwt-key-here
```

## Environment Setup

### Development (.env.local)

```bash
# Copy this template to .env.local
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/milea-estate
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
RESEND_API_KEY=your_resend_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
JWT_SECRET=your_jwt_secret
```

### Production

Set these environment variables in your hosting platform (Render, Vercel, etc.)

## Feature Dependencies

### SMS Coaching (Required Variables)

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

### Email Reports (Required Variables)

- `RESEND_API_KEY`

### AI Insights (Required Variables)

- `ANTHROPIC_API_KEY`

### Competition System (Required Variables)

- All SMS variables (for competition SMS)
- All Email variables (for competition notifications)

### Database Operations (Required Variables)

- `MONGODB_URI` or `DATABASE_URL`

## Validation

The application validates environment variables on startup:

- Missing required variables will cause startup failures
- Optional features will be disabled if their variables are missing
- Health check endpoints report environment status

## Security Notes

- Never commit environment variables to version control
- Use different API keys for development and production
- Rotate API keys regularly
- Use strong JWT secrets
- Keep MongoDB connection strings secure 