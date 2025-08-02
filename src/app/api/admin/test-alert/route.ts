import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { AlertSubscriberModel, EmailSubscriptionModel } from "@/lib/models";

export async function POST(request: NextRequest) {
  try {
    console.log("=== TESTING ALERT SYSTEM ===");
    
    await connectToDatabase();
    
    // Get alert subscribers from database
    const alertSubscribers = await AlertSubscriberModel.find({}).sort({ createdAt: -1 });
    const subscriberIds = alertSubscribers.map(sub => sub.subscriberId);
    
    console.log(`Found ${subscriberIds.length} alert subscribers:`, subscriberIds);
    
    if (subscriberIds.length === 0) {
      return NextResponse.json({ 
        message: "No alert subscribers configured. Please add subscribers in Alert Settings first." 
      });
    }

    // Get the actual subscriber details with phone numbers
    const subscribers = await EmailSubscriptionModel.find({
      _id: { $in: subscriberIds },
      "smsCoaching.isActive": true
    }).select('name smsCoaching.phoneNumber');
    
    const phoneNumbers = subscribers.map(sub => sub.smsCoaching?.phoneNumber).filter(Boolean);
    
    console.log(`Found ${phoneNumbers.length} valid phone numbers for test alerts:`, phoneNumbers);
    
    if (phoneNumbers.length === 0) {
      return NextResponse.json({ 
        message: "No valid phone numbers found for alert subscribers. Make sure subscribers have SMS coaching enabled." 
      });
    }

    const { sendSMS } = await import("@/lib/sms/client");
    
    const testMessage = `🧪 Test Alert\n\nThis is a test alert from the SMS campaign system.\nTime: ${new Date().toLocaleString()}\n\nIf you receive this, the alert system is working!`;

    console.log(`Sending test alert message: ${testMessage}`);

    let successCount = 0;
    let errorCount = 0;

    // Send test alerts to all configured phone numbers
    for (const alertPhone of phoneNumbers) {
      try {
        console.log(`Sending test alert to ${alertPhone}...`);
        await sendSMS(alertPhone, testMessage);
        console.log(`✅ Test alert sent successfully to ${alertPhone}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to send test alert to ${alertPhone}:`, error);
        errorCount++;
      }
    }
    
    console.log("=== TEST ALERT COMPLETE ===");
    
    return NextResponse.json({ 
      message: `Test alert sent to ${successCount} phone number(s). ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
      successCount,
      errorCount,
      phoneNumbers,
      subscriberCount: subscriberIds.length
    });
  } catch (error) {
    console.error("Error testing alert system:", error);
    return NextResponse.json({ error: "Failed to test alert system" }, { status: 500 });
  }
} 