import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { EmailSubscriptionModel } from "@/lib/models";

export async function GET() {
  try {
    await connectToDatabase();
    
    // Get Russell's subscriber record
    const subscriber = await EmailSubscriptionModel.findOne({
      name: "Russell moss",
      email: "russell@mileaestatevineyard.com"
    });

    if (!subscriber) {
      return NextResponse.json({ error: "Russell not found" });
    }

    // Test different phone number formats
    const testPhoneNumbers = [
      "+18457073347",
      "8457073347", 
      "18457073347",
      "8457073347"
    ];

    const results = [];
    for (const testPhone of testPhoneNumbers) {
      const found = await EmailSubscriptionModel.findOne({
        "smsCoaching.phoneNumber": testPhone,
        "smsCoaching.isActive": true,
      });
      
      results.push({
        testPhone,
        found: !!found,
        subscriberName: found?.name || null
      });
    }

    return NextResponse.json({
      subscriber: {
        name: subscriber.name,
        email: subscriber.email,
        phoneNumber: subscriber.smsCoaching?.phoneNumber,
        hasSmsCoaching: !!subscriber.smsCoaching?.isActive
      },
      testResults: results
    });
  } catch (error) {
    console.error("Error testing phone matching:", error);
    return NextResponse.json(
      { error: "Failed to test phone matching" },
      { status: 500 }
    );
  }
} 