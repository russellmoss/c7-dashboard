import { config } from "dotenv";
import { resolve } from "path";

import { getSmsService } from "../lib/sms/sms-worker.worker.js";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });

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
  const testNumber = "+18457073347";
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
