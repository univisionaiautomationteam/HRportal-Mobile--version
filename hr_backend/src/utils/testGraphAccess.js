import { getGraphAccessToken } from "./msGraphAuth.js";
import axios from "axios";

/**
 * Test Microsoft Graph connectivity and permissions
 */
export const testMicrosoftGraphAccess = async () => {
  try {
    console.log("\n🔍 Testing Microsoft Graph Access...");
    
    // Test 1: Get access token
    console.log("  1️⃣ Getting access token...");
    const token = await getGraphAccessToken();
    console.log("     ✅ Token obtained successfully");

    // Test 2: Get current user info
    console.log("  2️⃣ Testing Graph API connectivity...");
    const response = await axios.get(
      "https://graph.microsoft.com/v1.0/me",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log(`     ✅ Connected as: ${response.data.userPrincipalName}`);

    // Test 3: Check calendar access
    console.log("  3️⃣ Testing calendar access...");
    const calendarResponse = await axios.get(
      "https://graph.microsoft.com/v1.0/me/calendars",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log(`     ✅ Calendar access: ${calendarResponse.data.value.length} calendars found`);

    console.log("\n✅ Microsoft Graph is properly configured!\n");
    return {
      status: "success",
      user: response.data.userPrincipalName,
      calendars: calendarResponse.data.value.length,
    };
  } catch (error) {
    console.error("\n❌ Microsoft Graph Test Failed:");
    console.error(`   Error: ${error.message}`);
    if (error.response?.data) {
      console.error(`   Details: ${JSON.stringify(error.response.data)}`);
    }
    console.error("\n⚠️ Check your Microsoft Graph credentials in .env\n");
    return {
      status: "failed",
      error: error.message,
    };
  }
};
