import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function debugSMSCoaching() {
  try {
    console.log('🔍 Debugging SMS Coaching Configuration...');
    
    // Get the base URL from environment or use localhost
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3003';
    
    console.log(`📡 Using API endpoint: ${baseUrl}`);
    
    // First, let's get all subscriptions
    const response = await fetch(`${baseUrl}/api/admin/subscriptions`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch subscriptions: ${response.status}`);
    }
    
    const subscriptions = await response.json();
    console.log(`📋 Found ${subscriptions.length} subscriptions`);
    
    // Check each subscription for SMS coaching configuration
    for (const subscription of subscriptions) {
      console.log(`\n👤 Subscription: ${subscription.name} (${subscription.email})`);
      console.log(`   ID: ${subscription._id}`);
      console.log(`   SMS Coaching Active: ${subscription.smsCoaching?.isActive}`);
      console.log(`   Phone Number: ${subscription.smsCoaching?.phoneNumber || 'Not set'}`);
      console.log(`   Staff Members: ${subscription.smsCoaching?.staffMembers?.length || 0}`);
      
      if (subscription.smsCoaching?.staffMembers) {
        subscription.smsCoaching.staffMembers.forEach((staff, index) => {
          console.log(`     Staff ${index + 1}: ${staff.name}`);
          console.log(`       Active: ${staff.isActive}`);
          console.log(`       Dashboards: ${staff.dashboards?.length || 0}`);
          
          if (staff.dashboards) {
            staff.dashboards.forEach(dashboard => {
              console.log(`         ${dashboard.periodType}: ${dashboard.isActive ? 'Active' : 'Inactive'} (${dashboard.timeEST})`);
            });
          }
        });
      }
      
      // Test the SMS coaching API for this subscription
      if (subscription.smsCoaching?.isActive && subscription.smsCoaching?.phoneNumber) {
        console.log(`   🧪 Testing SMS coaching API...`);
        try {
          const testResponse = await fetch(`${baseUrl}/api/admin/send-sms-coaching`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subscriptionId: subscription._id,
              periodType: 'mtd'
            })
          });
          
          if (testResponse.ok) {
            const result = await testResponse.json();
            console.log(`   ✅ SMS coaching test successful: ${result.message}`);
          } else {
            const errorData = await testResponse.json();
            console.log(`   ❌ SMS coaching test failed: ${errorData.error}`);
          }
        } catch (error) {
          console.log(`   ❌ SMS coaching test error: ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugSMSCoaching(); 