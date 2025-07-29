import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function updateMTDSchedules() {
  try {
    console.log('🎯 Updating MTD schedules to 8:15 AM EST for testing...');
    
    // Get the base URL from environment or use localhost
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3003';
    
    console.log(`📡 Using API endpoint: ${baseUrl}`);
    
    // First, let's get the current subscriptions
    const response = await fetch(`${baseUrl}/api/admin/subscriptions`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch subscriptions: ${response.status}`);
    }
    
    const subscriptions = await response.json();
    console.log(`📋 Found ${subscriptions.length} subscriptions`);
    
    // Update each subscription's MTD schedule
    for (const subscription of subscriptions) {
      if (subscription.isActive && subscription.smsCoaching?.isActive) {
        console.log(`\n👤 Updating ${subscription.name} (${subscription.email})...`);
        
        // Update the MTD schedule to 8:15 AM EST
        const updatedSubscription = {
          ...subscription,
          reportSchedules: {
            ...subscription.reportSchedules,
            mtd: {
              ...subscription.reportSchedules?.mtd,
              timeEST: '08:15'
            }
          },
          smsCoaching: {
            ...subscription.smsCoaching,
            staffMembers: subscription.smsCoaching.staffMembers?.map(staff => ({
              ...staff,
              dashboards: staff.dashboards?.map(dashboard => 
                dashboard.periodType === 'mtd' 
                  ? { ...dashboard, timeEST: '08:15' }
                  : dashboard
              )
            }))
          }
        };
        
        // Send the update
        const updateResponse = await fetch(`${baseUrl}/api/admin/subscriptions/${subscription._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedSubscription)
        });
        
        if (updateResponse.ok) {
          console.log(`✅ Updated ${subscription.name} MTD schedule to 8:15 AM EST`);
        } else {
          console.error(`❌ Failed to update ${subscription.name}: ${updateResponse.status}`);
        }
      }
    }
    
    console.log('\n🎯 MTD schedules have been updated to 8:15 AM EST for testing!');
    console.log('⏰ The backend worker should trigger these jobs at 8:15 AM EST (12:15 PM UTC)');
    console.log('📱 Check the backend worker logs to see if the jobs are triggered correctly');

  } catch (error) {
    console.error('❌ Error updating MTD schedules:', error);
  }
}

// Run the script
updateMTDSchedules(); 