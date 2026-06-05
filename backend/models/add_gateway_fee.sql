-- migrations/add_gateway_fee.sql
-- Add gateway_fee column to orders table (amount in paise)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS gateway_fee INTEGER NOT NULL DEFAULT 0;
