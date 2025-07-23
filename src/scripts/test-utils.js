require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') });
const { connectToDatabase } = require('../lib/mongodb-cjs.js');
const { KPIDataModel, CronJobLogModel, EmailSubscriptionModel } = require('../lib/models-cjs.js');

async function run() {
  await connectToDatabase();

  // Test KPIData: create, fetch, update
  const dummyKPI = await KPIDataModel.findOneAndUpdate(
    { periodType: 'mtd', year: 2025 },
    {
      periodType: 'mtd',
      year: 2025,
      generatedAt: new Date().toISOString(),
      data: { test: true },
      status: 'generating',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log('Saved KPIData:', dummyKPI);

  const fetchedKPI = await KPIDataModel.findOne({ periodType: 'mtd', year: 2025 });
  console.log('Fetched KPIData:', fetchedKPI);

  const updatedKPI = await KPIDataModel.findOneAndUpdate(
    { periodType: 'mtd', year: 2025 },
    { status: 'completed' },
    { new: true }
  );
  console.log('Updated KPIData status:', updatedKPI.status);

  // Test CronJobLog: create, fetch
  const cronLog = await CronJobLogModel.create({
    jobType: 'mtd',
    status: 'running',
    startTime: new Date(),
  });
  console.log('Created CronJobLog:', cronLog);

  const recentLogs = await CronJobLogModel.find({ jobType: 'mtd' }).sort({ startTime: -1 }).limit(3);
  console.log('Recent CronJobLogs:', recentLogs);

  // Test EmailSubscription: subscribe, unsubscribe
  const sub = await EmailSubscriptionModel.findOneAndUpdate(
    { email: 'test@example.com' },
    { $set: { email: 'test@example.com', subscribedReports: ['mtd', 'ytd'], active: true } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log('Subscribed:', sub);

  const unsub = await EmailSubscriptionModel.findOneAndUpdate(
    { email: 'test@example.com' },
    { $set: { active: false } },
    { new: true }
  );
  console.log('Unsubscribed:', unsub);

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
}); 