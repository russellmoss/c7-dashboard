// test-order-associate.js
// This tests how sales associates are stored in orders vs customers

require("dotenv").config({
  path: require("path").resolve(__dirname, ".env.local"),
});
const axios = require("axios");
const chalk = require("chalk");

const { C7_APP_ID, C7_API_KEY, C7_TENANT_ID } = process.env;
const BASE_URL = "https://api.commerce7.com/v1";

function getAuthHeaders() {
  const authString = `${C7_APP_ID}:${C7_API_KEY}`;
  const encoded = Buffer.from(authString).toString("base64");
  return {
    Authorization: `Basic ${encoded}`,
    tenant: C7_TENANT_ID,
    "Content-Type": "application/json",
  };
}

async function testOrderAssociates() {
  console.log(chalk.blue("🔍 Testing Sales Associate Attribution in Orders...\n"));
  
  try {
    // Get recent orders with club membership items
    console.log(chalk.yellow("Step 1: Finding orders with club memberships..."));
    
    // Get orders from July 2025
    const ordersResponse = await axios.get(`${BASE_URL}/order`, {
      headers: getAuthHeaders(),
      params: {
        orderPaidDate: 'btw:2025-07-01|2025-07-31',
        limit: 10,
        page: 1
      }
    });
    
    console.log(`Found ${ordersResponse.data.orders.length} orders from July 2025\n`);
    
    let foundClubSignup = false;
    
    for (const order of ordersResponse.data.orders) {
      // Check if order has club membership items
      const hasClubItem = order.items?.some(item => 
        item.type === 'clubMembership' || 
        item.productType === 'Club Membership' ||
        item.title?.toLowerCase().includes('club')
      );
      
      if (hasClubItem) {
        foundClubSignup = true;
        console.log(chalk.green(`\n✅ Found order with club signup: ${order.orderNumber}`));
        console.log(`Order Date: ${order.createdAt}`);
        console.log(`Customer ID: ${order.customerId}`);
        
        // Check how sales associate is stored in the order
        console.log(chalk.cyan("\nSales Associate fields in ORDER:"));
        console.log("- salesAssociate:", JSON.stringify(order.salesAssociate, null, 2));
        console.log("- associate:", order.associate);
        console.log("- associateName:", order.associateName);
        console.log("- createdBy:", order.createdBy);
        
        // Now fetch the customer to compare
        if (order.customerId) {
          console.log(chalk.cyan("\nFetching CUSTOMER data..."));
          
          try {
            const customerResponse = await axios.get(`${BASE_URL}/customer/${order.customerId}`, {
              headers: getAuthHeaders()
            });
            
            const customer = customerResponse.data;
            
            console.log(chalk.cyan("\nSales Associate fields in CUSTOMER:"));
            console.log("- salesAssociate:", JSON.stringify(customer.salesAssociate, null, 2));
            console.log("- associate:", customer.associate);
            console.log("- associateName:", customer.associateName);
            console.log("- assignedTo:", customer.assignedTo);
            
            // Check if they match
            const orderAssociate = order.salesAssociate?.name || order.associateName || "Unknown";
            const customerAssociate = customer.salesAssociate?.name || customer.associateName || "Unknown";
            
            if (orderAssociate !== customerAssociate) {
              console.log(chalk.red(`\n⚠️  MISMATCH DETECTED!`));
              console.log(`Order Associate: ${orderAssociate}`);
              console.log(`Customer Associate: ${customerAssociate}`);
            } else {
              console.log(chalk.green(`\n✓ Associates match: ${orderAssociate}`));
            }
            
          } catch (custError) {
            console.log(chalk.red(`\n❌ Error fetching customer: ${custError.message}`));
          }
        }
        
        // Add delay for rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    if (!foundClubSignup) {
      console.log(chalk.yellow("\n⚠️  No orders with club signups found in this batch"));
      console.log("Try adjusting the date range or increasing the limit");
    }
    
    // Test the club-membership endpoint directly
    console.log(chalk.blue("\n\n📋 Testing Club Membership Endpoint..."));
    
    const clubMembershipsResponse = await axios.get(`${BASE_URL}/club-membership`, {
      headers: getAuthHeaders(),
      params: {
        signupDate: 'btw:2025-07-01|2025-07-31',
        limit: 5
      }
    });
    
    console.log(`\nFound ${clubMembershipsResponse.data.clubMemberships.length} club memberships from July`);
    
    // Check what fields are available on club memberships
    if (clubMembershipsResponse.data.clubMemberships.length > 0) {
      const sampleMembership = clubMembershipsResponse.data.clubMemberships[0];
      console.log("\nSample club membership structure:");
      console.log("Fields available:", Object.keys(sampleMembership));
      
      // Check if there's any associate info
      console.log("\nChecking for associate info in membership:");
      console.log("- salesAssociate:", sampleMembership.salesAssociate);
      console.log("- associate:", sampleMembership.associate);
      console.log("- createdBy:", sampleMembership.createdBy);
      console.log("- Has nested customer?", !!sampleMembership.customer);
    }
    
  } catch (error) {
    console.error(chalk.red("❌ Error:"), error.response?.data || error.message);
  }
}

// Run the test
testOrderAssociates();