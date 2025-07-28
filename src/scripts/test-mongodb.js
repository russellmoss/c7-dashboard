require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env.local"),
});
const { connectToDatabase } = require("../lib/mongodb-cjs.cjs");

(async () => {
  try {
    await connectToDatabase();
    console.log("✅ MongoDB connection test passed");
    process.exit(0);
  } catch (err) {
    console.error("❌ MongoDB connection test failed:", err);
    process.exit(1);
  }
})();
