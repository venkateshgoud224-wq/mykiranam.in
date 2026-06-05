-- migrations/add_commitment_columns.sql
-- Adds columns needed for the Commitment Payment & Savings UI

-- Ensure the orders table exists first (it does in schema.sql)

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS traditional_price DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_fee DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS surge_fee DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_commitment DECIMAL(10,2) DEFAULT 0;
