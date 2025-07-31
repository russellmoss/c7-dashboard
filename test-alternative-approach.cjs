// test-alternative-approach.js
// Test finding the original order that created each club membership

require("dotenv").config({
  path: require("path").resolve(__dirname, ".env.local"),
});
const axios = require("axios");
const chalk = require("chalk");

const { C7_APP_ID, C7_API_KEY, C7_TENANT_ID } = process.env;
const BASE_URL = "https://api.commerce7.com/v1";

const CLUB_NAMES = {
  "2ba4f45e-51b9-45af-ab34-6162b9383948": "Jumper Club",
  "a708a00a-2bd6-4f5d-9ce6-e1e37b107808": "Grand Prix Club",
  "0a2dbd7e-656c-4cb9-a0c7-146187fccefe": "Triple Crown Club"
};

function getAuthHeaders() {
  const authString = `${C7_APP_ID}:${C7_API_KEY}`;
  const encoded = Buffer.from(authString).toString("base64");
  return {
    Authorization: `Basic ${encoded}`,
    tenant: C7_TENANT_ID,
    "Content-Type": "application/json",
  };
}

async function testAlternativeApproach() {
  console.log(chalk.blue("🔬 Testing Alternative Approach: Finding Orders for Club Signups\n"));
  
  try {
    // Step 1: Get July club memberships
    console.log(chalk.yellow("Step 1: Getting July club memberships..."));
    
    const clubMembershipsResponse = await axios.get(`${BASE_URL}/club-membership`, {
      headers: getAuthHeaders(),
      params: {
        signupDate: 'btw:2025-07-01|2025-07-31',
        limit: 10
      }
    });
    
    const memberships = clubMembershipsResponse.data.clubMemberships;
    console.log(`Found ${memberships.length} club memberships\n`);
    
    // Step 2: For each membership, try to find the order
    for (let i = 0; i < Math.min(3, memberships.length); i++) {
      const membership = memberships[i];
      const signupDate = new Date(membership.signupDate);
      const clubName = CLUB_NAMES[membership.clubId] || membership.clubId;
      
      console.log(chalk.cyan(`\n--- Membership ${i + 1} ---`));
      console.log(`Club: ${clubName}`);
      console.log(`Customer ID: ${membership.customerId}`);
      console.log(`Signup Date: ${signupDate.toISOString()}`);
      
      // Search for orders from this customer around the signup date
      // Look within a 7-day window
      const searchStart = new Date(signupDate);
      searchStart.setDate(searchStart.getDate() - 3);
      const searchEnd = new Date(signupDate);
      searchEnd.setDate(searchEnd.getDate() + 3);
      
      console.log(chalk.yellow(`\nSearching for orders between ${searchStart.toDateString()} and ${searchEnd.toDateString()}...`));
      
      const ordersResponse = await axios.get(`${BASE_URL}/order`, {
        headers: getAuthHeaders(),
        params: {
          customerId: membership.customerId,
          orderPaidDate: `btw:${searchStart.toISOString().split('T')[0]}|${searchEnd.toISOString().split('T')[0]}`,
          limit: 10
        }
      });
      
      const orders = ordersResponse.data.orders;
      console.log(`Found ${orders.length} orders from this customer in date range`);
      
      // Look for the order with club membership item
      let foundClubOrder = false;
      for (const order of orders) {
        const clubItems = order.items?.filter(item => 
          item.type === 'clubMembership' || 
          item.productType === 'Club Membership' ||
          item.title?.toLowerCase().includes('club') ||
          item.clubId === membership.clubId
        );
        
        if (clubItems && clubItems.length > 0) {
          foundClubOrder = true;
          console.log(chalk.green(`\n✅ Found matching order: ${order.orderNumber}`));
          console.log(`Order Date: ${order.createdAt}`);
          console.log(`Sales Associate: ${order.salesAssociate?.name || order.associateName || 'Unknown'}`);
          
          // Show the club item details
          console.log("\nClub item(s) in order:");
          clubItems.forEach(item => {
            console.log(`  - ${item.title || item.productTitle} (${item.quantity}x)`);
            if (item.clubId) console.log(`    Club ID: ${item.clubId}`);
          });
          
          break;
        }
      }
      
      if (!foundClubOrder) {
        console.log(chalk.red("❌ Could not find order with club signup"));
        
        // Show all orders to debug
        console.log("\nAll orders found:");
        orders.forEach(order => {
          console.log(`  - ${order.orderNumber} on ${order.createdAt} by ${order.salesAssociate?.name || 'Unknown'}`);
        });
      }
      
      // Rate limit delay
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Test if we can search orders by item type
    console.log(chalk.blue("\n\n🔍 Testing if we can search orders by club membership items..."));
    
    const julyOrders = await axios.get(`${BASE_URL}/order`, {
      headers: getAuthHeaders(),
      params: {
        orderPaidDate: 'btw:2025-07-01|2025-07-31',
        limit: 50,
        page: 1
      }
    });
    
    // Count orders with club items and their associates
    const clubOrders = [];
    julyOrders.data.orders.forEach(order => {
      const hasClubItem = order.items?.some(item => 
        item.type === 'clubMembership' || 
        item.productType === 'Club Membership' ||
        item.title?.toLowerCase().includes('club membership')
      );
      
      if (hasClubItem) {
        clubOrders.push({
          orderNumber: order.orderNumber,
          customerId: order.customerId,
          associate: order.salesAssociate?.name || order.associateName || 'Unknown',
          date: order.createdAt
        });
      }
    });
    
    console.log(`\nFound ${clubOrders.length} orders with club signups out of ${julyOrders.data.orders.length} orders`);
    
    // Show associate distribution
    const associateCounts = {};
    clubOrders.forEach(order => {
      associateCounts[order.associate] = (associateCounts[order.associate] || 0) + 1;
    });
    
    console.log("\nClub signups by associate:");
    Object.entries(associateCounts).forEach(([associate, count]) => {
      console.log(`  - ${associate}: ${count} signups`);
    });
    
  } catch (error) {
    console.error(chalk.red("❌ Error:"), error.response?.data || error.message);
  }
}

// Run the test
testAlternativeApproach();