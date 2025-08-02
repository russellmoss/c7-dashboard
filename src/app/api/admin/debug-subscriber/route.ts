import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { EmailSubscriptionModel } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Find Russell moss subscriber
    const subscriber = await EmailSubscriptionModel.findOne({
      name: "Russell moss"
    });

    if (!subscriber) {
      return NextResponse.json({ error: "Subscriber not found" });
    }

    // Test different phone number formats
    const testPhoneNumbers = [
      "+18457073347",
      "18457073347", 
      "8457073347",
      " 18457073347 ",
      "+1 845 707 3347",
      "845-707-3347"
    ];

    const results = testPhoneNumbers.map(testPhone => {
      const cleanPhone = testPhone.trim().replace(/\s+/g, '');
      const withoutPlus = cleanPhone.replace(/^\+/, '');
      const withoutCountryCode = cleanPhone.replace(/^\+1/, '');
      
      return {
        testPhone,
        cleanPhone,
        withoutPlus,
        withoutCountryCode,
        matches: {
          exact: subscriber.smsCoaching?.phoneNumber === cleanPhone,
          withoutPlus: subscriber.smsCoaching?.phoneNumber === withoutPlus,
          withoutCountryCode: subscriber.smsCoaching?.phoneNumber === withoutCountryCode
        }
      };
    });

    return NextResponse.json({
      subscriber: {
        name: subscriber.name,
        phoneNumber: subscriber.smsCoaching?.phoneNumber,
        isActive: subscriber.smsCoaching?.isActive,
        hasSmsCoaching: !!subscriber.smsCoaching
      },
      testResults: results
    });
  } catch (error) {
    console.error("Error debugging subscriber:", error);
    return NextResponse.json({ error: "Failed to debug subscriber" }, { status: 500 });
  }
} 