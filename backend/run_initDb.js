const db = require('./config/db');

async function run() {
  console.log("Initializing DB for Phase 6B migrations...");
  await db.initDb();
  console.log("Done.");
  process.exit(0);
}

run();
