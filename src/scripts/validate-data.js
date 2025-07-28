require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env.local"),
});
const fs = require("fs");
const path = require("path");
const { connectToDatabase } = require("../lib/mongodb-cjs.cjs");
const { KPIDataModel } = require("../lib/models-cjs.cjs");

function deepCompare(obj1, obj2, pathPrefix = "") {
  const diffs = [];
  if (typeof obj1 !== typeof obj2) {
    diffs.push(
      `${pathPrefix}: Type mismatch (${typeof obj1} vs ${typeof obj2})`,
    );
    return diffs;
  }
  if (typeof obj1 !== "object" || obj1 === null || obj2 === null) {
    if (obj1 !== obj2) diffs.push(`${pathPrefix}: ${obj1} !== ${obj2}`);
    return diffs;
  }
  const keys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
  for (const key of keys) {
    const newPath = pathPrefix ? `${pathPrefix}.${key}` : key;
    if (!(key in obj1)) {
      diffs.push(`${newPath}: missing in original JSON`);
      continue;
    }
    if (!(key in obj2)) {
      diffs.push(`${newPath}: missing in MongoDB`);
      continue;
    }
    diffs.push(...deepCompare(obj1[key], obj2[key], newPath));
  }
  return diffs;
}

async function validateData(periodType) {
  // Load original JSON file
  const safePeriodType = periodType.replace(":", "-");
  const jsonFiles = fs
    .readdirSync(__dirname)
    .filter(
      (f) => f.includes(`C7_KPI_Data_${safePeriodType}`) && f.endsWith(".json"),
    )
    .sort((a, b) => b.localeCompare(a));
  if (!jsonFiles.length) {
    console.error("No JSON files found for comparison");
    return;
  }
  const originalData = JSON.parse(
    fs.readFileSync(path.join(__dirname, jsonFiles[0]), "utf8"),
  );
  // Load MongoDB data
  await connectToDatabase();
  const mongoData = await KPIDataModel.findOne({
    periodType,
    year: new Date().getFullYear(),
  }).lean();
  if (!mongoData) {
    console.error("No MongoDB data found for this period");
    return;
  }
  // Deep comparison
  const differences = deepCompare(originalData, mongoData.data);
  if (differences.length === 0) {
    console.log("✅ Data validation passed!");
  } else {
    console.error("❌ Data validation failed:");
    differences.forEach((d) => console.error(`  - ${d}`));
  }
}

// Usage: node validate-data.js mtd
const periodType = process.argv[2] || "mtd";
validateData(periodType);
