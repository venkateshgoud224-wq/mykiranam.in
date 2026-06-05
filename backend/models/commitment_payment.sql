-- migrations/commitment_payment.sql
-- Table to store commitment payment details per order
CREATE TABLE IF NOT EXISTS commitment_payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- amount in paise
    status TEXT NOT NULL CHECK (status IN ('pending','paid','refunded','settled')),
    razorpay_payment_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
