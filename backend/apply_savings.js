const db = require('./config/db');

const applySavingsSchema = async () => {
    try {
        console.log('Applying Phase 8B Savings Schema...');
        
        await db.query(`
            -- Customer Savings Table
            CREATE TABLE IF NOT EXISTS customer_savings (
                customer_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                total_orders INT DEFAULT 0,
                total_savings DECIMAL(10,2) DEFAULT 0.00,
                total_time_saved INT DEFAULT 0,
                last_order_date TIMESTAMP WITH TIME ZONE,
                favorite_shop_id INTEGER REFERENCES shops(id) ON DELETE SET NULL
            );

            -- Community Savings Table
            CREATE TABLE IF NOT EXISTS community_savings (
                id SERIAL PRIMARY KEY,
                total_orders INT DEFAULT 0,
                total_savings DECIMAL(15,2) DEFAULT 0.00,
                total_time_saved INT DEFAULT 0,
                last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Initialize community savings with one row
            INSERT INTO community_savings (total_orders, total_savings, total_time_saved) 
            SELECT 0, 0, 0 
            WHERE NOT EXISTS (SELECT 1 FROM community_savings);


        `);

        console.log('Successfully applied Savings Schema!');
        process.exit(0);
    } catch (error) {
        console.error('Error applying schema:', error);
        process.exit(1);
    }
};

applySavingsSchema();
