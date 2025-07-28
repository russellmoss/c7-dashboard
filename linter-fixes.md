# ESLint Fix Guide - Step by Step Cursor.ai Prompts

## Overview
- **Total Issues**: 109 (3 errors, 106 warnings)
- **Main Issue**: 90+ unused imports/variables
- **Critical Errors**: 3 (all related to `confirm` usage)

## Step 1: Fix Critical Errors First (3 errors)

### Prompt 1: Fix 'confirm' usage
```
Fix all "Unexpected use of 'confirm'" errors by replacing confirm with window.confirm in these files:
- src/app/admin/competitions/page.tsx (line 473)
- src/app/admin/page.tsx (line 330)
- src/components/admin/SubscriptionModal.tsx (line 409)
```

## Step 2: Auto-remove All Unused Imports/Variables (90+ warnings)

### Prompt 2: Remove all unused imports at once
```
Remove all unused imports and variables across the entire codebase. These are marked with "@typescript-eslint/no-unused-vars" warnings. Use ESLint's auto-fix capability or manually remove them. Do NOT remove variables that are actually used in JSX or passed as props.
```

### Prompt 3: If some remain, target specific patterns
```
Remove these specific unused imports from all files:
1. Remove unused component imports (Card, CardContent, CardHeader, etc.) from files where they're imported but not used
2. Remove unused icon imports (Wine, Clock, CheckCircle, etc.) from files where they're imported but not used
3. Remove unused React imports (useState, useEffect) where they're not used
4. Remove unused model imports (EmailSubscriptionModel, CoachingSMSHistory, etc.) where they're not used
```

## Step 3: Fix React Hook Dependencies (5 warnings)

### Prompt 4: Fix useEffect dependencies
```
Fix React Hook useEffect dependencies in these files:
1. src/app/admin/analytics/page.tsx (line 214) - add 'fetchAnalytics' to dependency array
2. src/app/admin/archive/page.tsx (line 169) - add 'fetchData' to dependency array
3. src/app/admin/competitions/page.tsx (line 207) - add 'fetchCompetitions' to dependency array
4. src/app/dashboard/[period]/page.tsx (line 41) - add 'fetchData' to dependency array
5. src/components/admin/SubscriptionModal.tsx (line 253) - add 'reportKeys' to dependency array

For each, wrap the function in useCallback if needed to prevent infinite loops.
```

## Step 4: Fix Remaining Specific Issues

### Prompt 5: Fix accessibility warning
```
Fix the jsx-a11y/heading-has-content warning in src/components/ui/card.tsx (line 39). Either add content to the heading or add aria-label for screen readers.
```

### Prompt 6: Fix unreachable code
```
Fix the unreachable code warning in src/lib/sms/progress-sms.ts (line 475). Remove or restructure the code after the return statement.
```

## Step 5: Clean Up Assigned but Never Used Variables

### Prompt 7: Remove unused assignments
```
Remove or use these assigned but never used variables:
1. src/app/admin/competitions/page.tsx - 'isSmsPreviewLoading' (line 92)
2. src/app/admin/page.tsx - 'handleSubmit' (line 103), 'handleToggleActive' (line 345), 'handleReportToggle' (line 367)
3. src/app/admin/competitions/page.tsx - 'handlePreviewWelcomeSMS' (line 342)
4. src/app/dashboard/all-quarters/page.tsx - 'setInsights' (line 22)
5. src/app/dashboard/mtd/page.tsx - 'praise' and 'coaching' (lines 93-94)
6. src/components/admin/SubscriptionModal.tsx - 'handleDelete' (line 406)

Either use these functions/variables or remove them entirely.
```

## Step 6: Bulk Remove Type Imports

### Prompt 8: Clean up unused type imports
```
Remove these unused type imports:
- Remove unused type imports in src/types/kpi.ts (DashboardSchedule, StaffMemberCoaching, CoachingSMSHistory)
- Remove unused model type imports across all files
- Keep only the types that are actually used in the files
```

## Step 7: Final Verification

### Prompt 9: Run final check
```
Run eslint again and show me any remaining issues. If there are any, fix them.
```

## Quick Alternative: Nuclear Option

If you want to fix everything at once:

### Prompt 10: Aggressive auto-fix
```
1. First, auto-fix everything possible: Run "npx eslint . --fix"
2. For all remaining unused imports/variables warnings, remove them
3. Replace all instances of bare "confirm" with "window.confirm"
4. For all useEffect dependency warnings, add the missing dependencies and wrap functions in useCallback where needed
5. Show me any remaining issues after these fixes
```

## Verification Script

After all fixes, run:
```bash
npx eslint "src/**/*.{ts,tsx}" --max-warnings 0
```

This approach should reduce the 109 issues to 0 in about 10-15 minutes of work with Cursor.ai.