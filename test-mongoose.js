const mongoose = require("mongoose");
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/milea-estate";

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected:", mongoose.connection.readyState);
  const Test = mongoose.model("Test", new mongoose.Schema({ name: String }));
  await Test.create({ name: "hello" });
  console.log("Inserted!");
  await mongoose.disconnect();
}

main();
