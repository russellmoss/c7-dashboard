import { testConnection } from '../lib/mongodb.js';

(async () => {
  const ok = await testConnection();
  if (ok) {
    console.log('✅ MongoDB connection test passed');
    process.exit(0);
  } else {
    console.error('❌ MongoDB connection test failed');
    process.exit(1);
  }
})(); 