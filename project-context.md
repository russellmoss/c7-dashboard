# Milea Estate KPI Dashboard Project Context

## Project Overview

Building a Next.js dashboard to visualize KPI data for Milea Estate Vineyard, replacing manual JSON file generation with a MongoDB-backed web application.

## Current State

- Have a working Node.js script (optimized-kpi-dashboard.js) that generates KPI data
- Need to build web dashboard with same calculations
- Must preserve all calculation logic exactly

## Key Technical Details

- Next.js 14 with App Router
- MongoDB Atlas for data storage
- Anthropic Claude API for AI insights
- Commerce7 API for source data
- Deployed on Render

## Critical Requirements

1. All calculations must match original script exactly
2. Must handle long-running processes (up to 20 min for all-quarters)
3. Scheduled runs at 1 AM, 2 AM, 3 AM, 4 AM EST
4. Mobile-responsive with wine industry branding

## Known Challenges

- Commerce7 API rate limits (2 second delays required)
- Large data volumes (thousands of orders)
- Complex conversion rate calculations
- Year-over-year comparisons

## Success Criteria

- Data accuracy: 100% match with original script
- Performance: Under 20 minutes for all-quarters
- UI: Beautiful, mobile-responsive dashboards
- Reliability: Automated daily generation
