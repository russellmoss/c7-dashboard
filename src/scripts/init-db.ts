import { connectToDatabase } from '../lib/mongodb';
import { KPIDataModel, CronJobLogModel, EmailSubscriptionModel } from '../lib/models';

async function initDB() {
  await connectToDatabase();
  console.log('Connected to MongoDB. Ensuring collections and indexes...');

  // Ensure indexes for each model
  await KPIDataModel.createCollection();
  await KPIDataModel.syncIndexes();
  console.log('KPIData collection and indexes ensured.');

  await CronJobLogModel.createCollection();
  await CronJobLogModel.syncIndexes();
  console.log('CronJobLog collection and indexes ensured.');

  await EmailSubscriptionModel.createCollection();
  await EmailSubscriptionModel.syncIndexes();
  console.log('EmailSubscription collection and indexes ensured.');

  console.log('All collections and indexes are set up.');
  process.exit(0);
}

initDB().catch((err) => {
  console.error('Error initializing database:', err);
  process.exit(1);
}); 