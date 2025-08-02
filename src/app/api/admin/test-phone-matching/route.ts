import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { EmailSubscriptionModel } from "@/lib/models";

export async function POST(request: NextRequest) {
  try {
    console.log("=== TESTING PHONE MATCHING ===");
    await connectToDatabase();
    
    // Simulate the exact format Twilio is sending
    const testPhoneNumbers = [
      " 18457073347",  // With leading space (what Twilio sends)
      "18457073347",   // Without leading space
      "+18457073347",  // With + prefix
      "8457073347",    // What's in database
    ];

    const results = [];

    for (const testPhone of testPhoneNumbers) {
      console.log(`\nTesting phone: "${testPhone}"`);
      
      // Clean the phone number first (remove spaces and normalize)
      const cleanFromPhone = testPhone.trim().replace(/\s+/g, '');
      console.log(`Clean phone number: ${cleanFromPhone}`);

      // Try all our matching attempts
      let subscriber = await EmailSubscriptionModel.findOne({
        "smsCoaching.phoneNumber": cleanFromPhone,
        "smsCoaching.isActive": true,
      }).select('name _id smsCoaching.phoneNumber');

      console.log(`First attempt result: ${subscriber ? 'FOUND' : 'NOT FOUND'}`);

      if (!subscriber) {
        const phoneWithoutPlus = cleanFromPhone.replace(/^\+/, '');
        console.log(`Trying without + prefix: ${phoneWithoutPlus}`);
        subscriber = await EmailSubscriptionModel.findOne({
          "smsCoaching.phoneNumber": phoneWithoutPlus,
          "smsCoaching.isActive": true,
        }).select('name _id smsCoaching.phoneNumber');
        console.log(`Second attempt result: ${subscriber ? 'FOUND' : 'NOT FOUND'}`);
      }

      if (!subscriber) {
        const phoneWithoutCountryCode = cleanFromPhone.replace(/^\+1/, '');
        console.log(`Trying without country code: ${phoneWithoutCountryCode}`);
        subscriber = await EmailSubscriptionModel.findOne({
          "smsCoaching.phoneNumber": phoneWithoutCountryCode,
          "smsCoaching.isActive": true,
        }).select('name _id smsCoaching.phoneNumber');
        console.log(`Third attempt result: ${subscriber ? 'FOUND' : 'NOT FOUND'}`);
      }

      if (!subscriber) {
        const phoneWithPlus = cleanFromPhone.startsWith('+') ? cleanFromPhone : `+${cleanFromPhone}`;
        console.log(`Trying with + prefix: ${phoneWithPlus}`);
        subscriber = await EmailSubscriptionModel.findOne({
          "smsCoaching.phoneNumber": phoneWithPlus,
          "smsCoaching.isActive": true,
        }).select('name _id smsCoaching.phoneNumber');
        console.log(`Fourth attempt result: ${subscriber ? 'FOUND' : 'NOT FOUND'}`);
      }

      if (!subscriber) {
        // Try removing the leading "1" from the original number
        const originalWithoutLeadingOne = testPhone.replace(/\s+/g, '').replace(/^1/, '');
        console.log(`Trying original without leading 1: ${originalWithoutLeadingOne}`);
        subscriber = await EmailSubscriptionModel.findOne({
          "smsCoaching.phoneNumber": originalWithoutLeadingOne,
          "smsCoaching.isActive": true,
        }).select('name _id smsCoaching.phoneNumber');
        console.log(`Fifth attempt result: ${subscriber ? 'FOUND' : 'NOT FOUND'}`);
      }

      results.push({
        testPhone,
        cleanPhone: cleanFromPhone,
        found: !!subscriber,
        subscriberName: subscriber?.name || null,
        attempts: [
          { attempt: 'exact', phone: cleanFromPhone, found: !!subscriber },
          { attempt: 'without_plus', phone: cleanFromPhone.replace(/^\+/, ''), found: false },
          { attempt: 'without_country_code', phone: cleanFromPhone.replace(/^\+1/, ''), found: false },
          { attempt: 'with_plus', phone: cleanFromPhone.startsWith('+') ? cleanFromPhone : `+${cleanFromPhone}`, found: false },
          { attempt: 'without_leading_one', phone: testPhone.replace(/\s+/g, '').replace(/^1/, ''), found: false }
        ]
      });
    }

    return NextResponse.json({
      success: true,
      results: results
    });
  } catch (error) {
    console.error("Error testing phone matching:", error);
    return NextResponse.json({ error: "Failed to test phone matching" }, { status: 500 });
  }
} 