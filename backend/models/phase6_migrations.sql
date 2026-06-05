-- Phase 6: Savings Engine Tables

-- 1. Product Dictionary for the Predictive Search
CREATE TABLE IF NOT EXISTS products_dictionary (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    quantity_desc VARCHAR(100), -- e.g. "1 kg", "500 g"
    market_price DECIMAL(10,2) NOT NULL, -- The MRP (Original Price)
    discounted_price DECIMAL(10,2), -- Average selling price if available
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. User Lifetime Savings
CREATE TABLE IF NOT EXISTS user_savings (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_orders INT DEFAULT 0,
    total_money_saved DECIMAL(10,2) DEFAULT 0.00,
    total_time_saved INT DEFAULT 0, -- in minutes
    delivery_fee_avoided DECIMAL(10,2) DEFAULT 0.00,
    platform_fee_avoided DECIMAL(10,2) DEFAULT 0.00,
    surge_fee_avoided DECIMAL(10,2) DEFAULT 0.00,
    product_savings DECIMAL(10,2) DEFAULT 0.00,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Global Community Savings (Singleton table, typically one row with id=1)
CREATE TABLE IF NOT EXISTS global_savings (
    id SERIAL PRIMARY KEY,
    total_orders INT DEFAULT 0,
    total_money_saved DECIMAL(15,2) DEFAULT 0.00,
    total_time_saved INT DEFAULT 0, -- in minutes
    delivery_fee_avoided DECIMAL(15,2) DEFAULT 0.00,
    platform_fee_avoided DECIMAL(15,2) DEFAULT 0.00,
    surge_fee_avoided DECIMAL(15,2) DEFAULT 0.00,
    product_savings DECIMAL(15,2) DEFAULT 0.00,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert the initial global row if not exists
INSERT INTO global_savings (id, total_orders) 
SELECT 1, 0 WHERE NOT EXISTS (SELECT 1 FROM global_savings WHERE id = 1);
