-- Seller KYC Table Migration
-- Run this to add KYC identity verification support

CREATE TABLE IF NOT EXISTS seller_kyc (
    id SERIAL PRIMARY KEY,
    shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE UNIQUE,
    seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    owner_full_name VARCHAR(150),
    aadhaar_number VARCHAR(12),
    pan_number VARCHAR(10),
    business_type VARCHAR(50) DEFAULT 'Sole Proprietor',
    gst_number VARCHAR(15),
    bank_account_number VARCHAR(20),
    bank_ifsc_code VARCHAR(11),
    aadhaar_image TEXT,
    pan_image TEXT,
    declaration_accepted BOOLEAN DEFAULT false,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookup by seller
CREATE INDEX IF NOT EXISTS idx_seller_kyc_seller_id ON seller_kyc(seller_id);
