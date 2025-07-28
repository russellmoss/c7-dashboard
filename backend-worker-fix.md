# Fix SMS Worker Issue - Step-by-Step Guide for Cursor AI

## Step 1: Diagnose the Current Issue

### Cursor Prompt:

```
Look at src/lib/sms-service.node.ts and src/scripts/background-worker.ts. Find where the SMS client is initialized and where the "SMS client not initialized" message is coming from. Also check how environment variables are loaded. Show me the initialization code and explain why it might not be working.
```

### Expected Finding:

The issue is likely that the Twilio client isn't being initialized properly due to:

- Environment variables not being loaded before initialization
- Singleton pattern issues
- Import timing problems

## Step 2: Fix Environment Variable Loading

### Cursor Prompt:

```
In src/scripts/background-worker.ts, ensure environment variables are loaded BEFORE any imports that might use them. Move the dotenv config to the very top of the file, before any other imports. Use the correct path resolution for .env.local.
```

### Code to Apply:

```typescript
// src/scripts/background-worker.ts
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables FIRST, before any other imports
config({ path: resolve(process.cwd(), ".env.local") });

// Now import everything else
import { processScheduledJobs } from "../lib/scheduling.node.js";
import { initializeSmsService } from "../lib/sms-service.node.js";
// ... other imports
```

## Step 3: Fix SMS Service Initialization

### Cursor Prompt:

```
In src/lib/sms-service.node.ts, create a proper initialization pattern that:
1. Checks if Twilio credentials exist before creating the client
2. Provides clear error messages if credentials are missing
3. Ensures the client is initialized before any SMS sending attempts
4. Uses a singleton pattern correctly
```

### Code to Apply:

```typescript
// src/lib/sms-service.node.ts
import twilio from "twilio";

let twilioClient: ReturnType<typeof twilio> | null = null;
let initializationError: string | null = null;

export function initializeSmsService(): void {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    console.log("[SMS Service] Initializing with credentials:", {
      accountSid: accountSid ? `${accountSid.substring(0, 8)}...` : "NOT SET",
      authToken: authToken ? "SET" : "NOT SET",
      phoneNumber: phoneNumber ? phoneNumber : "NOT SET",
    });

    if (!accountSid || !authToken || !phoneNumber) {
      initializationError = `Missing Twilio credentials: ${!accountSid ? "TWILIO_ACCOUNT_SID " : ""}${!authToken ? "TWILIO_AUTH_TOKEN " : ""}${!phoneNumber ? "TWILIO_PHONE_NUMBER" : ""}`;
      console.error("[SMS Service]", initializationError);
      return;
    }

    twilioClient = twilio(accountSid, authToken);
    console.log("[SMS Service] Twilio client initialized successfully");
  } catch (error) {
    initializationError = `Failed to initialize Twilio client: ${error}`;
    console.error("[SMS Service]", initializationError);
  }
}

export async function sendSms(to: string, body: string): Promise<boolean> {
  if (!twilioClient) {
    console.error(
      "[SMS Service] Cannot send SMS: client not initialized.",
      initializationError,
    );
    return false;
  }

  try {
    const message = await twilioClient.messages.create({
      body,
      to,
      from: process.env.TWILIO_PHONE_NUMBER!,
    });

    console.log(`[SMS Service] SMS sent successfully. SID: ${message.sid}`);
    return true;
  } catch (error) {
    console.error("[SMS Service] Failed to send SMS:", error);
    return false;
  }
}

// Initialize immediately when module is loaded
initializeSmsService();
```

## Step 4: Update Background Worker

### Cursor Prompt:

```
Update src/scripts/background-worker.ts to:
1. Properly initialize the SMS service after environment variables are loaded
2. Check if SMS was actually sent before logging "SUCCESS"
3. Add better error handling and logging
```

### Code to Apply:

```typescript
// src/scripts/background-worker.ts
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables FIRST
config({ path: resolve(process.cwd(), ".env.local") });
console.log(
  "[Worker] Environment loaded. TWILIO_ACCOUNT_SID:",
  process.env.TWILIO_ACCOUNT_SID ? "SET" : "NOT SET",
);

import { processScheduledJobs } from "../lib/scheduling.node.js";
import { initializeSmsService } from "../lib/sms-service.node.js";

async function main() {
  console.log("[Worker] Starting background worker...");

  // Ensure SMS service is initialized
  initializeSmsService();

  try {
    await processScheduledJobs();
  } catch (error) {
    console.error("[Worker] Error processing jobs:", error);
    process.exit(1);
  }
}

main();
```

## Step 5: Update Scheduling Logic

### Cursor Prompt:

```
In src/lib/scheduling.node.ts (or wherever processScheduledJobs is defined), update the SMS sending logic to:
1. Check the return value of sendSms()
2. Only log "SUCCESS" if the SMS was actually sent
3. Log "FAILED" with details if it wasn't sent
```

### Code to Apply:

```typescript
// src/lib/scheduling.node.ts
import { sendSms } from "./sms-service.node.js";

export async function processScheduledJobs() {
  console.log(
    `[${new Date().toISOString()}] INFO: Processing scheduled jobs...`,
  );

  // ... subscription fetching logic ...

  for (const subscription of activeSubscriptions) {
    const phoneNumber = subscription.phoneNumber;
    const message = `Your scheduled message for ${subscription.name}`;

    const success = await sendSms(phoneNumber, message);

    if (success) {
      console.log(
        `[${new Date().toISOString()}] SUCCESS: Sent SMS to ${phoneNumber} for ${subscription.name}`,
      );
    } else {
      console.log(
        `[${new Date().toISOString()}] FAILED: Could not send SMS to ${phoneNumber} for ${subscription.name}`,
      );
    }
  }

  console.log(
    `[${new Date().toISOString()}] INFO: Completed processing scheduled jobs`,
  );
}
```

## Step 6: Clean Up Project Structure

### Cursor Prompt:

```
Create a new shared utilities structure that works for both Next.js and Node.js:
1. Create src/lib/sms/base.ts with the core SMS logic (no imports with extensions)
2. Create src/lib/sms/client.ts for Next.js usage
3. Create src/lib/sms/worker.ts for worker usage (handles imports correctly)
4. Delete the old sms-service.ts and sms-service.node.ts files
```

### Code to Apply:

```typescript
// src/lib/sms/base.ts
import twilio from "twilio";

export interface SmsService {
  sendSms(to: string, body: string): Promise<boolean>;
  isInitialized(): boolean;
}

export class TwilioSmsService implements SmsService {
  private client: ReturnType<typeof twilio> | null = null;
  private error: string | null = null;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !phoneNumber) {
      this.error = "Missing Twilio credentials";
      console.error("[TwilioSmsService]", this.error);
      return;
    }

    try {
      this.client = twilio(accountSid, authToken);
      console.log("[TwilioSmsService] Initialized successfully");
    } catch (error) {
      this.error = `Initialization failed: ${error}`;
      console.error("[TwilioSmsService]", this.error);
    }
  }

  isInitialized(): boolean {
    return this.client !== null;
  }

  async sendSms(to: string, body: string): Promise<boolean> {
    if (!this.client) {
      console.error("[TwilioSmsService] Cannot send SMS:", this.error);
      return false;
    }

    try {
      const message = await this.client.messages.create({
        body,
        to,
        from: process.env.TWILIO_PHONE_NUMBER!,
      });
      console.log(`[TwilioSmsService] SMS sent: ${message.sid}`);
      return true;
    } catch (error) {
      console.error("[TwilioSmsService] Send failed:", error);
      return false;
    }
  }
}
```

```typescript
// src/lib/sms/client.ts (for Next.js)
import { TwilioSmsService } from "./base";

let smsService: TwilioSmsService | null = null;

export function getSmsService(): TwilioSmsService {
  if (!smsService) {
    smsService = new TwilioSmsService();
  }
  return smsService;
}
```

```typescript
// src/lib/sms/worker.ts (for Node.js worker)
import { TwilioSmsService } from "./base.js";

let smsService: TwilioSmsService | null = null;

export function getSmsService(): TwilioSmsService {
  if (!smsService) {
    smsService = new TwilioSmsService();
  }
  return smsService;
}

export const sendSms = async (to: string, body: string): Promise<boolean> => {
  return getSmsService().sendSms(to, body);
};
```

## Step 7: Update TypeScript Configuration

### Cursor Prompt:

```
Create separate TypeScript configurations:
1. Update tsconfig.json for Next.js (keep module resolution as is)
2. Create tsconfig.worker.json for the worker with proper Node.js ESM settings
3. Update the build script to use the correct config for the worker
```

### Code to Apply:

```json
// tsconfig.worker.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "ES2022",
    "target": "ES2022",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/scripts/**/*", "src/lib/**/*"],
  "exclude": ["src/app/**/*", "src/pages/**/*", "src/components/**/*"]
}
```

## Step 8: Update Package.json Scripts

### Cursor Prompt:

```
Update package.json to add proper build and run scripts for the worker:
1. Add a build:worker script that uses tsconfig.worker.json
2. Add a worker:dev script for development
3. Add a worker:prod script for production
4. Ensure the worker runs as an ES module
```

### Code to Apply:

```json
// package.json
{
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "build:worker": "tsc -p tsconfig.worker.json",
    "worker:dev": "npm run build:worker && node --loader ts-node/esm dist/scripts/background-worker.js",
    "worker:prod": "node dist/scripts/background-worker.js",
    "worker:watch": "nodemon --watch src --ext ts --exec 'npm run worker:dev'"
  }
}
```

## Step 9: Final Testing

### Cursor Prompt:

```
Create a test script src/scripts/test-sms.ts that:
1. Loads environment variables
2. Initializes the SMS service
3. Sends a test SMS
4. Reports success or failure with detailed logging
This will help verify everything is working before running the full worker.
```

### Code to Apply:

```typescript
// src/scripts/test-sms.ts
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });

import { getSmsService } from "../lib/sms/worker.js";

async function testSms() {
  console.log("=== SMS Service Test ===");
  console.log("Environment variables:");
  console.log(
    "- TWILIO_ACCOUNT_SID:",
    process.env.TWILIO_ACCOUNT_SID ? "SET" : "NOT SET",
  );
  console.log(
    "- TWILIO_AUTH_TOKEN:",
    process.env.TWILIO_AUTH_TOKEN ? "SET" : "NOT SET",
  );
  console.log(
    "- TWILIO_PHONE_NUMBER:",
    process.env.TWILIO_PHONE_NUMBER || "NOT SET",
  );

  const smsService = getSmsService();
  console.log("\nSMS Service initialized:", smsService.isInitialized());

  if (!smsService.isInitialized()) {
    console.error("SMS Service failed to initialize. Check your credentials.");
    process.exit(1);
  }

  // Replace with a real phone number for testing
  const testNumber = "+1234567890";
  const testMessage = "Test message from worker";

  console.log(`\nSending test SMS to ${testNumber}...`);
  const success = await smsService.sendSms(testNumber, testMessage);

  if (success) {
    console.log("✅ SMS sent successfully!");
  } else {
    console.log("❌ Failed to send SMS");
  }
}

testSms().catch(console.error);
```

## Step 10: Run and Verify

### Commands to Execute:

```bash
# 1. Build the worker
npm run build:worker

# 2. Test SMS functionality
node dist/scripts/test-sms.js

# 3. Run the worker
npm run worker:prod

# 4. Check Twilio console to verify SMS was sent
```

## Troubleshooting Checklist

### Cursor Prompt:

```
If SMS is still not sending, check these in order:
1. Verify .env.local has all three Twilio variables set correctly
2. Add console.log(process.env) at the top of the worker to see all env vars
3. Check if the phone number format is correct (+1 prefix for US numbers)
4. Verify Twilio account has SMS credits and is not in trial mode restrictions
5. Check Twilio error logs in their dashboard for detailed error messages
```

This guide should help you systematically fix the SMS worker issue while also cleaning up the project structure for better maintainability.
