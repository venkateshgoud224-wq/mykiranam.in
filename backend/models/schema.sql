-- Drop tables if they exist (for clean migrations/resets)
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
    pref_browser_notif BOOLEAN DEFAULT true,
    pref_sounds BOOLEAN DEFAULT true,
    pref_whatsapp BOOLEAN DEFAULT true,
    pref_email BOOLEAN DEFAULT true,
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
    payment_method VARCHAR(30) CHECK (payment_method IN ('Pay During Pickup', 'Manual UPI Payment')),
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
    item_change_history TEXT
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
    no_show_count INT DEFAULT 0
);

-- Seller Performance Table
CREATE TABLE IF NOT EXISTS seller_performance (
    shop_id INTEGER PRIMARY KEY REFERENCES shops(id) ON DELETE CASCADE,
    response_time_avg INT DEFAULT 0,
    order_completion_pct DECIMAL(5,2) DEFAULT 100.00,
    cancellation_pct DECIMAL(5,2) DEFAULT 0.00,
    total_completed_orders INT DEFAULT 0,
    total_cancelled_orders INT DEFAULT 0
);


