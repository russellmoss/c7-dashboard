// test-customer-api.js
// Save this file and run: node test-customer-api.js

require("dotenv").config({
  path: require("path").resolve(__dirname, ".env.local"),
});
const axios = require("axios");

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

async function testCustomerAPI() {
  console.log("🔍 Testing Commerce7 Customer API...\n");
  
  try {
    // Step 1: Get a list of customers to find one with a known sales associate
    console.log("Step 1: Fetching customer list...");
    const customersResponse = await axios.get(`${BASE_URL}/customer`, {
      headers: getAuthHeaders(),
      params: {
        limit: 5,
        page: 1
      }
    });
    
    console.log(`Found ${customersResponse.data.customers.length} customers\n`);
    
    // Step 2: For each customer, fetch detailed info
    for (const customer of customersResponse.data.customers) {
      console.log(`\n--- Customer: ${customer.email || customer.id} ---`);
      
      // Fetch full customer details
      const detailResponse = await axios.get(`${BASE_URL}/customer/${customer.id}`, {
        headers: getAuthHeaders()
      });
      
      const customerDetail = detailResponse.data;
      
      // Display all fields that might contain sales associate info
      console.log("Looking for sales associate fields:");
      console.log("- salesAssociate:", customerDetail.salesAssociate);
      console.log("- associateName:", customerDetail.associateName);
      console.log("- associate:", customerDetail.associate);
      console.log("- assignedTo:", customerDetail.assignedTo);
      console.log("- createdBy:", customerDetail.createdBy);
      console.log("- salesRep:", customerDetail.salesRep);
      
      // Show all top-level fields
      console.log("\nAll top-level fields:");
      Object.keys(customerDetail).forEach(key => {
        if (typeof customerDetail[key] !== 'object' || customerDetail[key] === null) {
          console.log(`  ${key}: ${customerDetail[key]}`);
        }
      });
      
      // If there's a nested user or staff object
      if (customerDetail.user) {
        console.log("\nUser object:", JSON.stringify(customerDetail.user, null, 2));
      }
      if (customerDetail.staff) {
        console.log("\nStaff object:", JSON.stringify(customerDetail.staff, null, 2));
      }
      
      // Wait a bit to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Step 3: Test club membership with customer expansion
    console.log("\n\n🎯 Testing Club Membership API with customer data...");
    const clubResponse = await axios.get(`${BASE_URL}/club-membership`, {
      headers: getAuthHeaders(),
      params: {
        limit: 3,
        page: 1
      }
    });
    
    console.log(`\nFound ${clubResponse.data.clubMemberships.length} club memberships`);
    
    // Check if we can expand customer data in the membership call
    for (const membership of clubResponse.data.clubMemberships) {
      console.log(`\nMembership ${membership.id}:`);
      console.log("- customerId:", membership.customerId);
      console.log("- Has customer object?", !!membership.customer);
      if (membership.customer) {
        console.log("- Customer in membership:", JSON.stringify(membership.customer, null, 2));
      }
    }
    
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Headers:", error.response.headers);
    }
  }
}

// Run the test
testCustomerAPI();