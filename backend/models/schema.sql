-- DROP TABLE IF EXISTS customer_reports;
-- DROP TABLE IF EXISTS seller_customer_blocks;
-- DROP TABLE IF EXISTS seller_performance;
-- DROP TABLE IF EXISTS customer_trust;
-- DROP TABLE IF EXISTS notifications;
-- DROP TABLE IF EXISTS orders;
-- DROP TABLE IF EXISTS shops;
-- DROP TABLE IF EXISTS users;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    role VARCHAR(20) DEFAULT 'pending' CHECK (role IN ('customer', 'seller', 'admin', 'pending')),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE, -- Enforce unique constraint for fraud prevention
    profile_image VARCHAR(255),
    whatsapp_number VARCHAR(20),
    verified_whatsapp BOOLEAN DEFAULT false,
    verified_email BOOLEAN DEFAULT false,
    pref_browser_notif BOOLEAN DEFAULT true,
    pref_sounds BOOLEAN DEFAULT true,
    pref_whatsapp BOOLEAN DEFAULT true,
    pref_email BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Shops Table
CREATE TABLE IF NOT EXISTS shops (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    shop_name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(9,6) NOT NULL,
    longitude DECIMAL(9,6) NOT NULL,
    rating DECIMAL(2,1) DEFAULT 4.0,
    active_orders INT DEFAULT 0,
    waiting_time INT DEFAULT 15, -- in minutes
    availability_status VARCHAR(20) DEFAULT 'Available' CHECK (availability_status IN ('Available', 'Busy', 'Offline')),
    discounts VARCHAR(255),
    verified BOOLEAN DEFAULT false,
    
    -- Phase 2 verification fields
    verification_status VARCHAR(25) DEFAULT 'Pending' CHECK (verification_status IN ('Pending', 'Under Review', 'Verified', 'Rejected', 'Suspended')),
    verified_by_admin BOOLEAN DEFAULT false,
    verified_by_seller BOOLEAN DEFAULT false,
    verification_date TIMESTAMP WITH TIME ZONE,
    working_hours VARCHAR(100) DEFAULT '08:00 - 22:00',
    shop_category VARCHAR(50) DEFAULT 'General Provisions',
    
    -- 5 mandatory images
    image_front TEXT,
    image_counter TEXT,
    image_inside1 TEXT,
    image_inside2 TEXT,
    image_additional TEXT,
    
    -- performance averages
    average_completion_time INT DEFAULT 20, -- in minutes
    average_response_time INT DEFAULT 5, -- in minutes
    
    max_active_orders INT DEFAULT 10,
    online_start_time VARCHAR(5) DEFAULT '08:00',
    online_end_time VARCHAR(5) DEFAULT '22:00',
    upi_id VARCHAR(100),
    qr_code_image VARCHAR(255),
    
    -- Phase 6B: Quality & Accountability
    verified_complaints_count INT DEFAULT 0,
    warning_level VARCHAR(50) DEFAULT 'None' CHECK (warning_level IN ('None', 'Warning', 'Monitoring', 'Final Warning', 'Suspended', 'Banned')),
    suspension_end_date TIMESTAMP WITH TIME ZONE,
    total_reviews INT DEFAULT 0,
    
    -- Feature 2: Delivery Navigation & Customer Location
    delivery_option VARCHAR(30) DEFAULT 'Pickup Only' CHECK (delivery_option IN ('Pickup Only', 'Delivery Only', 'Pickup + Delivery')),
    delivery_charges DECIMAL(10,2) DEFAULT 0.00,
    delivery_time VARCHAR(100) DEFAULT '',
    catalog_enabled BOOLEAN DEFAULT false,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    shop_id INTEGER REFERENCES shops(id) ON DELETE SET NULL,
    original_chitti TEXT,
    modified_bill TEXT,
    amount DECIMAL(10,2),
    gateway_fee DECIMAL(10,2) DEFAULT 0,
    payment_method VARCHAR(30),
    payment_status VARCHAR(20) DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Uploaded Proof', 'Paid', 'Failed')),
    payment_proof_image TEXT,
    notes TEXT,
    preferred_pickup_time VARCHAR(50),
    order_status VARCHAR(50) DEFAULT 'Waiting For Seller' CHECK (order_status IN (
        'Waiting For Seller', 
        'Accepted', 
        'Bill Uploaded', 
        'Waiting For Customer Confirmation', 
        'Confirmed', 
        'Packing Started', 
        'Packing Completed', 
        'Ready For Pickup', 
        'Delivered', 
        'Pickup Overdue',
        'Cancelled'
    )),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    custom_order_id VARCHAR(50),
    accepted_at TIMESTAMP WITH TIME ZONE,
    packing_started_at TIMESTAMP WITH TIME ZONE,
    ready_for_pickup_at TIMESTAMP WITH TIME ZONE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    order_type VARCHAR(20) DEFAULT 'handwritten',
    digital_item_list TEXT,
    modified_item_list TEXT,
    item_change_history TEXT,
    pickup_otp VARCHAR(10),
    otp_generated_at TIMESTAMP WITH TIME ZONE,
    otp_verified_at TIMESTAMP WITH TIME ZONE,
    pickup_deadline TIMESTAMP WITH TIME ZONE,

    -- Feature 2: Delivery Navigation & Customer Location
    fulfillment_method VARCHAR(20) DEFAULT 'Pickup' CHECK (fulfillment_method IN ('Pickup', 'Delivery')),
    delivery_address TEXT,
    delivery_landmark TEXT,
    delivery_phone VARCHAR(20),
    delivery_latitude DECIMAL(9,6),
    delivery_longitude DECIMAL(9,6)
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    channel VARCHAR(50) DEFAULT 'Web' CHECK (channel IN ('Web', 'WhatsApp', 'Email', 'Multiple')),
    read_status BOOLEAN DEFAULT false,
    sent_status VARCHAR(20) DEFAULT 'Sent' CHECK (sent_status IN ('Pending', 'Sent', 'Failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Customer Trust Table
CREATE TABLE IF NOT EXISTS customer_trust (
    customer_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    successful_pickups INT DEFAULT 0,
    cancellations INT DEFAULT 0,
    no_show_count INT DEFAULT 0,
    -- Phase 7A additions
    total_orders INT DEFAULT 0,
    active_order_limit INT DEFAULT 2,
    suspension_end_date TIMESTAMP WITH TIME ZONE,
    abandoned_orders INT DEFAULT 0,
    cancellation_warnings INT DEFAULT 0,
    no_pickup_warnings INT DEFAULT 0,
    trust_score INT DEFAULT 100,
    customer_level VARCHAR(50) DEFAULT 'Platinum Customer',
    fake_complaints INT DEFAULT 0,
    abuse_reports INT DEFAULT 0
);

-- Seller Customer Blocks
CREATE TABLE IF NOT EXISTS seller_customer_blocks (
    id SERIAL PRIMARY KEY,
    seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(seller_id, customer_id)
);

-- Customer Reports
CREATE TABLE IF NOT EXISTS customer_reports (
    id SERIAL PRIMARY KEY,
    seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'Pending Review',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seller Performance Table
CREATE TABLE IF NOT EXISTS seller_performance (
    shop_id INTEGER PRIMARY KEY REFERENCES shops(id) ON DELETE CASCADE,
    response_time_avg INT DEFAULT 0,
    order_completion_pct DECIMAL(5,2) DEFAULT 100.00,
    cancellation_pct DECIMAL(5,2) DEFAULT 0.00,
    total_completed_orders INT DEFAULT 0,
    total_cancelled_orders INT DEFAULT 0,
    trust_score INT DEFAULT 100,
    seller_level VARCHAR(50) DEFAULT 'Platinum Seller',
    complaint_rate DECIMAL(5,2) DEFAULT 0.00,
    verified_complaints INT DEFAULT 0
);

-- Suspicious Activities Table (Phase 7B)
CREATE TABLE IF NOT EXISTS suspicious_activities (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    risk_score INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Pending Review' CHECK (status IN ('Pending Review', 'Approved', 'Dismissed')),
    related_orders JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Platform Analytics (Hits)
CREATE TABLE IF NOT EXISTS platform_hits (
    hit_date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
    count INT DEFAULT 0
);

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

-- Order Chats Table (Phase 6A)
CREATE TABLE IF NOT EXISTS order_chats (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    sender_role VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Complaints Table (Phase 6B)
CREATE TABLE IF NOT EXISTS complaints (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
    issue_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    evidence_images JSONB,
    status VARCHAR(50) DEFAULT 'Open' CHECK (status IN ('Open', 'Under Review', 'Seller Responded', 'Escalated', 'Resolved', 'Closed')),
    is_verified BOOLEAN DEFAULT false,
    ai_priority VARCHAR(20) DEFAULT 'None' CHECK (ai_priority IN ('None', 'Low', 'Medium', 'High')),
    ai_recommendation TEXT,
    ai_risk_score INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reviews Table (Phase 6B)
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
    product_quality INT CHECK (product_quality BETWEEN 1 AND 5),
    service_quality INT CHECK (service_quality BETWEEN 1 AND 5),
    order_accuracy INT CHECK (order_accuracy BETWEEN 1 AND 5),
    overall_experience INT CHECK (overall_experience BETWEEN 1 AND 5),
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Suspension History Table (Phase 6B)
CREATE TABLE IF NOT EXISTS suspension_history (
    id SERIAL PRIMARY KEY,
    shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
    warning_level VARCHAR(50) NOT NULL,
    reason TEXT NOT NULL,
    suspended_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Phase 8A: Central Item Database & Quote Engine

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(100) DEFAULT 'General',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_aliases (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    alias_name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS historical_prices (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
    price_per_unit DECIMAL(10,2) NOT NULL,
    quantity DECIMAL(10,3) DEFAULT 1.0,
    unit VARCHAR(50) DEFAULT 'unit',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shop_price_index (
    shop_id INTEGER PRIMARY KEY REFERENCES shops(id) ON DELETE CASCADE,
    average_basket_index INT DEFAULT 100,
    last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quote_history (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    items_requested TEXT NOT NULL,
    generated_quotes TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS price_analytics (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE, -- NULL means platform-wide
    average_7_day DECIMAL(10,2),
    average_30_day DECIMAL(10,2),
    average_90_day DECIMAL(10,2),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, shop_id)
);

-- Seller Products Table for Seller Catalog Management
CREATE TABLE IF NOT EXISTS seller_products (
    id SERIAL PRIMARY KEY,
    shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
    seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'General',
    price DECIMAL(10,2) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(shop_id, product_name)
);

