const db = require('./config/db');

const unblockAll = async () => {
  console.log('Unblocking all customers...');
  await db.initDb();
  await db.query('DELETE FROM seller_customer_blocks');
  console.log('All customers have been successfully unblocked!');
  process.exit(0);
};

unblockAll();
