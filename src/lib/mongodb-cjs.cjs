// CommonJS version for scripts
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

let cached = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function connectToDatabase() {
  // 1 = connected, 2 = connecting
  if (mongoose.connection.readyState === 1) {
    console.log('📊 Using existing MongoDB connection');
    return mongoose;
  }
  if (mongoose.connection.readyState === 2) {
    // If connecting, wait for it to finish
    await new Promise(resolve => mongoose.connection.once('connected', resolve));
    console.log('📊 Using existing (just connected) MongoDB connection');
    return mongoose;
  }
  // Otherwise, connect
  const opts = {
    bufferCommands: false,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4
  };
  console.log('📊 Creating new MongoDB connection...');
  await mongoose.connect(MONGODB_URI, opts);
  console.log('✅ MongoDB connected successfully');
  return mongoose;
}

module.exports = { connectToDatabase };
