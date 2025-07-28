# 🚀 Render Deployment Guide

## Overview
This application consists of two services deployed on Render:
- **Frontend**: Next.js web application with dynamic rendering
- **Backend**: Node.js worker service with cron jobs

## 📋 Service Configuration

### Frontend Service (milea-estate-dashboard)
- **Type**: Web Service
- **Runtime**: Node.js 18.20.0
- **Build Command**: Multi-step build with environment setup
- **Start Command**: `NODE_ENV=production npm start`
- **Health Check**: `/api/health`

### Backend Worker Service (milea-estate-worker)
- **Type**: Worker Service
- **Runtime**: Node.js 18.20.0
- **Build Command**: TypeScript compilation with test skipping
- **Start Command**: `NODE_ENV=production npm run start:worker`

## 🔧 Build Process

### Frontend Build Steps:
1. **Install Dependencies**: `NODE_ENV=production npm install`
2. **Build Next.js**: `npm run build:render` (with debug flag)
3. **Verify Build**: `npm run verify:render` (checks for BUILD_ID)
4. **Environment**: All tests skipped during production builds

### Backend Build Steps:
1. **Install Dependencies**: `NODE_ENV=production npm install`
2. **Compile TypeScript**: `npm run build:worker:prod`
3. **Environment**: Tests excluded from compilation

## 🌍 Environment Variables

### Production Environment:
- `NODE_ENV=production`
- `CI=true` (prevents test execution)
- `SKIP_INTEGRATION_TESTS=true`

### Next.js Configuration:
- `NEXT_DISABLE_STATIC_GENERATION=true`
- `NEXT_DISABLE_OPTIMIZATION=true`
- `NEXT_DISABLE_CACHE=true`
- `NEXT_DISABLE_STATIC_EXPORT=true`

### External Services (sync: false):
- `MONGODB_URI` - MongoDB Atlas connection
- `TWILIO_ACCOUNT_SID` - SMS service
- `TWILIO_AUTH_TOKEN` - SMS authentication
- `TWILIO_PHONE_NUMBER` - SMS phone number
- `RESEND_API_KEY` - Email service
- `ANTHROPIC_API_KEY` - AI insights
- `JWT_SECRET` - Authentication

## 🗄️ Database Configuration

### MongoDB Atlas Setup:
1. **Network Access**: Allow access from anywhere (0.0.0.0/0)
2. **Authentication**: Username/password in connection string
3. **Connection Pooling**: Configured for production use
4. **Persistent Connections**: Worker maintains persistent connection

### Connection Settings:
- **Max Pool Size**: 10
- **Min Pool Size**: 2
- **Socket Timeout**: 45 seconds
- **Server Selection Timeout**: 5 seconds
- **Heartbeat Frequency**: 10 seconds

## 🔄 Worker Service Features

### Cron Jobs:
- **Communications**: Every 5 minutes
- **KPI Generation**: Daily at 1-4 AM EST
- **SMS Processing**: Competition notifications
- **Email Reports**: Automated KPI reports

### Health Monitoring:
- **Connection Monitoring**: MongoDB connection status
- **Job Execution Logging**: Track cron job execution
- **Error Handling**: Graceful failure handling
- **Restart Capability**: Automatic service restart

## 🛠️ Troubleshooting

### Common Issues:

1. **Build Failures**:
   - Check `SKIP_INTEGRATION_TESTS=true`
   - Verify `NODE_ENV=production`
   - Ensure no test files in compilation

2. **Database Connection**:
   - Verify MongoDB Atlas IP whitelist
   - Check connection string format
   - Monitor connection pool usage

3. **Worker Issues**:
   - Check cron job schedules
   - Verify environment variables
   - Monitor job execution logs

### Debug Commands:
```bash
# Check build artifacts
npm run verify:render

# Test database connection
npm run health:check

# Verify worker build
npm run build:worker:prod
```

## 📊 Monitoring

### Health Checks:
- **Frontend**: `/api/health` endpoint
- **Database**: Connection ping tests
- **Worker**: Job execution monitoring

### Logs:
- **Build Logs**: Available in Render dashboard
- **Runtime Logs**: Application and worker logs
- **Error Logs**: Detailed error tracking

## 🔒 Security

### Environment Variables:
- All sensitive data stored as `sync: false`
- No secrets committed to repository
- Production-specific configurations

### Database Security:
- Strong authentication required
- Network access properly configured
- Connection string encryption

## 🚀 Deployment Checklist

- [ ] MongoDB Atlas configured with proper access
- [ ] All environment variables set in Render
- [ ] Build commands tested locally
- [ ] Health checks configured
- [ ] Worker cron jobs scheduled
- [ ] Database migrations completed
- [ ] External service APIs configured
- [ ] SSL certificates enabled
- [ ] Auto-deploy enabled for both services

## 📝 Notes

- **Static Generation**: Disabled for dynamic content
- **Caching**: Disabled to prevent stale data
- **Tests**: Skipped during production builds
- **Debug Mode**: Enabled for better error reporting
- **Port Configuration**: Uses `$PORT` environment variable 