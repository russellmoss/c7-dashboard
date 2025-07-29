import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function fixRussellSMS() {
  try {
    console.log('🔧 Fixing Russell\'s SMS Coaching Configuration...');
    
    // Get the base URL from environment or use localhost
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3003';
    
    console.log(`📡 Using API endpoint: ${baseUrl}`);
    
    // Russell's subscription ID
    const russellId = '6887ea9c4c2ad331daa56448';
    
    // Update Russell's subscription with SMS coaching enabled
    const updateData = {
      name: "Russell moss",
      email: "russell@mileaestatevineyard.com",
      phone: "8457073347", // Russell's correct phone number
      subscribedReports: ["mtd", "qtd", "ytd"],
      reportSchedules: {},
      smsCoaching: {
        isActive: true,
        phoneNumber: "8457073347", // Russell's correct phone number
        coachingStyle: "balanced",
        customMessage: "",
        staffMembers: [
          {
            id: "",
            name: "Mina Do", // Use Mina Do since Russell isn't in KPI data
            phoneNumber: "",
            enabled: true,
            isActive: true,
            dashboards: [
              {
                periodType: "mtd",
                frequency: "weekly",
                timeEST: "08:15",
                isActive: true,
                includeMetrics: {
                  wineConversionRate: true,
                  clubConversionRate: true,
                  goalVariance: true,
                  overallPerformance: true,
                },
              }
            ],
          }
        ],
      },
      isActive: true,
      personalizedGoals: {
        bottleConversionRate: { enabled: false, value: null },
        clubConversionRate: { enabled: false, value: null },
        aov: { enabled: false, value: null },
      },
    };
    
    console.log('📝 Updating Russell\'s subscription...');
    
    const response = await fetch(`${baseUrl}/api/admin/subscriptions/${russellId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Successfully updated Russell\'s subscription');
      console.log('📊 Updated SMS coaching configuration:');
      console.log(`   Active: ${result.smsCoaching?.isActive}`);
      console.log(`   Phone: ${result.smsCoaching?.phoneNumber}`);
      console.log(`   Staff Members: ${result.smsCoaching?.staffMembers?.length}`);
      
      // Test the SMS coaching API
      console.log('🧪 Testing SMS coaching API...');
      const testResponse = await fetch(`${baseUrl}/api/admin/send-sms-coaching`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: russellId,
          periodType: 'mtd'
        })
      });
      
      if (testResponse.ok) {
        const testResult = await testResponse.json();
        console.log(`✅ SMS coaching test successful: ${testResult.message}`);
      } else {
        const errorData = await testResponse.json();
        console.log(`❌ SMS coaching test failed: ${errorData.error}`);
      }
      
    } else {
      const errorData = await response.json();
      console.log(`❌ Failed to update subscription: ${errorData.error}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixRussellSMS(); 