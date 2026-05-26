-- Bangalore Real Hyperlocal Seeder SQL

-- 1. Create Demo Customers
INSERT INTO users (role, name, email, password, phone)
VALUES 
('customer', 'Rajesh Patel', 'demo_customer_1@gmail.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '9000000001'), -- password: password
('customer', 'Anitha Reddy', 'demo_customer_2@gmail.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '9000000002'),
('customer', 'Venkat Goud', 'demo_customer_3@gmail.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '9000000003')
ON CONFLICT (email) DO NOTHING;

-- Create trust profiles for customers
INSERT INTO customer_trust (customer_id, successful_pickups, cancellations, no_show_count)
SELECT id, 5, 0, 0 FROM users WHERE email = 'demo_customer_1@gmail.com' ON CONFLICT DO NOTHING;
INSERT INTO customer_trust (customer_id, successful_pickups, cancellations, no_show_count)
SELECT id, 12, 1, 0 FROM users WHERE email = 'demo_customer_2@gmail.com' ON CONFLICT DO NOTHING;
INSERT INTO customer_trust (customer_id, successful_pickups, cancellations, no_show_count)
SELECT id, 8, 0, 0 FROM users WHERE email = 'demo_customer_3@gmail.com' ON CONFLICT DO NOTHING;

-- 2. Create Demo Sellers (5 sellers owning 10 shops each to simplify local testing log-ins)
INSERT INTO users (role, name, email, password, phone)
VALUES 
('seller', 'Siva Prasad', 'demo_seller_1@gmail.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '9848022331'),
('seller', 'Sai Kumar', 'demo_seller_2@gmail.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '9848022332'),
('seller', 'Laxmi Narayana', 'demo_seller_3@gmail.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '9848022333'),
('seller', 'Mohammad Ahmed', 'demo_seller_4@gmail.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '9848022334'),
('seller', 'Gopal Rao', 'demo_seller_5@gmail.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '9848022335')
ON CONFLICT (email) DO NOTHING;

-- 3. Seed 50 Bangalore Shops (Coordinates centered around HSR Layout 12.9141, 77.6413)
-- We will pre-verify all of these shops and assign them UPI details so the demo simulation runs smoothly.

INSERT INTO shops (owner_id, shop_name, address, latitude, longitude, rating, active_orders, waiting_time, availability_status, discounts, verified, verification_status, verified_by_admin, verified_by_seller, verification_date, upi_id, shop_category, working_hours, max_active_orders)
VALUES
-- Seller 1 shops (1 to 10)
((SELECT id FROM users WHERE email='demo_seller_1@gmail.com'), 'Sai Srinivasa Kirana & General Store', 'Near Sector 2 Park, HSR Layout, Bangalore 560102', 12.9105, 77.6450, 4.6, 2, 10, 'Available', '5% off above ₹500', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'siva@upi', 'General Provisions', '08:00 - 22:00', 8),
((SELECT id FROM users WHERE email='demo_seller_1@gmail.com'), 'Bhaskar Kiranam & Soft Drinks', 'Sector 6 Main Road, HSR Layout, Bangalore 560102', 12.9185, 77.6390, 4.2, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'bhaskar@upi', 'Snacks & Sweets', '07:00 - 23:00', 10),
((SELECT id FROM users WHERE email='demo_seller_1@gmail.com'), 'Venkateshwara Kirana Store', 'Sector 7 HSR Layout, Bangalore 560102', 12.9141, 77.6413, 4.0, 1, 5, 'Available', 'Free salt packet on ₹600', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'venkat@upi', 'General Provisions', '08:00 - 21:00', 6),
((SELECT id FROM users WHERE email='demo_seller_1@gmail.com'), 'Abhiram Provisions & Groceries', 'Sector 3 Main Road, HSR Layout, Bangalore 560102', 12.9130, 77.6320, 3.9, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'abhiram@upi', 'Groceries & Fruits', '08:00 - 22:00', 12),
((SELECT id FROM users WHERE email='demo_seller_1@gmail.com'), 'Laxmi Prasanna Kiranam', 'Sector 4 HSR Layout, Bangalore 560102', 12.9195, 77.6295, 4.1, 4, 25, 'Busy', '10% off on first order', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'laxmi@upi', 'General Provisions', '08:00 - 22:00', 5),
((SELECT id FROM users WHERE email='demo_seller_1@gmail.com'), 'Balaji Kirana Merchant', '17th Cross Road, HSR Sector 6, Bangalore 560102', 12.9170, 77.6380, 4.5, 0, 0, 'Available', '5% off above ₹1000', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'balaji@upi', 'General Provisions', '08:00 - 22:00', 15),
((SELECT id FROM users WHERE email='demo_seller_1@gmail.com'), 'Maheshwari General Store', 'Sector 1 Outer Ring Rd, HSR Layout, Bangalore 560102', 12.9230, 77.6490, 3.8, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'mahesh@upi', 'General Provisions', '08:00 - 22:00', 8),
((SELECT id FROM users WHERE email='demo_seller_1@gmail.com'), 'Sri Rama Kirana Store', '24th Main Rd, HSR Sector 1, Bangalore 560102', 12.9245, 77.6520, 4.7, 5, 20, 'Busy', '₹50 off on bills above ₹1200', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'rama@upi', 'General Provisions', '07:30 - 22:30', 6),
((SELECT id FROM users WHERE email='demo_seller_1@gmail.com'), 'Gayatri Provision Stores', 'Sector 5, HSR Layout, Bangalore 560102', 12.9150, 77.6480, 4.3, 1, 8, 'Available', 'Free delivery nearby', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'gayatri@upi', 'Groceries & Fruits', '08:00 - 22:00', 10),
((SELECT id FROM users WHERE email='demo_seller_1@gmail.com'), 'Bangalore Wholesale Kiranam', '19th Main, Sector 4, HSR Layout, Bangalore 560102', 12.9180, 77.6330, 4.4, 0, 0, 'Available', 'Wholesale prices', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'bangalore@upi', 'General Provisions', '08:00 - 22:00', 20),

-- Seller 2 shops (11 to 20)
((SELECT id FROM users WHERE email='demo_seller_2@gmail.com'), 'Sri Raghavendra Super Market', 'Koramangala 4th Block, Bangalore 560034', 12.9315, 77.6295, 4.8, 1, 4, 'Available', '8% flat discount on groceries', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'raghav@upi', 'Groceries & Fruits', '08:00 - 22:00', 15),
((SELECT id FROM users WHERE email='demo_seller_2@gmail.com'), 'Navyasri Kiranam & Fancy Store', 'Koramangala 5th Block, Bangalore 560034', 12.9340, 77.6315, 4.0, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'navya@upi', 'Snacks & Sweets', '08:00 - 21:30', 8),
((SELECT id FROM users WHERE email='demo_seller_2@gmail.com'), 'Sri Vaishnavi Supermarket', 'Koramangala 3rd Block, Bangalore 560034', 12.9300, 77.6270, 4.3, 3, 12, 'Available', 'Free 100g sugar on ₹500', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'vaishna@upi', 'Organic & Fresh', '08:00 - 22:00', 12),
((SELECT id FROM users WHERE email='demo_seller_2@gmail.com'), 'Tirumala Kirana & General Store', '100 Feet Road, Indiranagar, Bangalore 560038', 12.9640, 77.6385, 4.1, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'tirumala@upi', 'General Provisions', '08:00 - 22:00', 10),
((SELECT id FROM users WHERE email='demo_seller_2@gmail.com'), 'Durga Kirana & General Store', 'Double Road, Indiranagar, Bangalore 560038', 12.9680, 77.6410, 4.2, 0, 0, 'Available', '5% cash back', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'durga@upi', 'General Provisions', '08:00 - 22:00', 8),
((SELECT id FROM users WHERE email='demo_seller_2@gmail.com'), 'Hanuman Kirana Store', 'Outer Ring Road, Bellandur, Bangalore 560103', 12.9280, 77.6780, 3.7, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'hanuman@upi', 'General Provisions', '08:00 - 21:00', 6),
((SELECT id FROM users WHERE email='demo_seller_2@gmail.com'), 'Karthik Kiranam & Fancy Store', 'Sarjapur Main Road, Bangalore 560035', 12.9220, 77.6740, 4.4, 0, 0, 'Available', 'Free delivery on ₹500', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'karthik@upi', 'Snacks & Sweets', '08:00 - 22:00', 10),
((SELECT id FROM users WHERE email='demo_seller_2@gmail.com'), 'Reddy Kirana & General Store', 'Sector 1 HSR Layout, Bangalore 560102', 12.9250, 77.6530, 4.5, 6, 30, 'Busy', '10% off above ₹1500', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'reddy@upi', 'General Provisions', '07:30 - 22:00', 5),
((SELECT id FROM users WHERE email='demo_seller_2@gmail.com'), 'Anusha Kiranam', '14th Main, HSR Layout Sec 4, Bangalore 560102', 12.9190, 77.6310, 4.0, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'anusha@upi', 'General Provisions', '08:00 - 21:30', 8),
((SELECT id FROM users WHERE email='demo_seller_2@gmail.com'), 'Pawan Wholesale Grocery', 'Marathahalli Bridge, Bangalore 560037', 12.9560, 77.6980, 4.2, 0, 0, 'Available', 'Wholesale discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'pawan@upi', 'General Provisions', '08:00 - 22:00', 25),

-- Seller 3 shops (21 to 30)
((SELECT id FROM users WHERE email='demo_seller_3@gmail.com'), 'Gandhi Kiranam & Provisions', 'Sector 6 Outer Ring Rd, HSR, Bangalore 560102', 12.9165, 77.6432, 4.5, 0, 0, 'Available', '5% off above ₹800', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'gandhi@upi', 'General Provisions', '08:00 - 22:00', 10),
((SELECT id FROM users WHERE email='demo_seller_3@gmail.com'), 'Sri Lakshmi Kirana and Provisions', 'BTM Layout 2nd Stage, Bangalore 560076', 12.9150, 77.6101, 4.3, 0, 0, 'Available', 'Free delivery', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'lakshmi@upi', 'Organic & Fresh', '08:00 - 22:00', 15),
((SELECT id FROM users WHERE email='demo_seller_3@gmail.com'), 'Jai Sri Ram Kiranam', 'Sector 2 HSR Layout, Bangalore 560102', 12.9100, 77.6440, 4.4, 0, 0, 'Available', '5% discount', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'sriram@upi', 'General Provisions', '08:00 - 22:00', 10),
((SELECT id FROM users WHERE email='demo_seller_3@gmail.com'), 'Vigneshwara Kirana Store', 'Sector 7 HSR, Bangalore 560102', 12.9143, 77.6415, 4.0, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'vignesh@upi', 'General Provisions', '08:00 - 21:00', 8),
((SELECT id FROM users WHERE email='demo_seller_3@gmail.com'), 'Divya Super Market', 'Sector 1 HSR, Bangalore 560102', 12.9234, 77.6502, 4.6, 1, 5, 'Available', '8% off above ₹1000', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'divya@upi', 'Groceries & Fruits', '08:00 - 22:00', 12),
((SELECT id FROM users WHERE email='demo_seller_3@gmail.com'), 'Manikantha Kirana Store', 'Bellandur Village Road, Bangalore 560103', 12.9290, 77.6720, 3.9, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'mani@upi', 'General Provisions', '08:00 - 22:00', 8),
((SELECT id FROM users WHERE email='demo_seller_3@gmail.com'), 'Srinivasa Wholesale Grocery', 'Domlur Layout, Bangalore 560071', 12.9610, 77.6330, 4.1, 0, 0, 'Available', 'Wholesale rates', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'srinivasa@upi', 'General Provisions', '08:00 - 22:00', 20),
((SELECT id FROM users WHERE email='demo_seller_3@gmail.com'), 'Pawan Wholesale Kirana Store', 'Sector 3 HSR Layout, Bangalore 560102', 12.9125, 77.6315, 4.3, 0, 0, 'Available', 'Wholesale items', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'pawan2@upi', 'General Provisions', '08:00 - 22:00', 15),
((SELECT id FROM users WHERE email='demo_seller_3@gmail.com'), 'Royal Kirana Store', 'Sector 4 Main HSR, Bangalore 560102', 12.9188, 77.6318, 4.2, 0, 0, 'Available', '5% off on rice', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'royal@upi', 'General Provisions', '08:00 - 22:00', 10),
((SELECT id FROM users WHERE email='demo_seller_3@gmail.com'), 'Janatha Kirana Shop', 'Sector 5 Outer Ring Rd, Bangalore 560102', 12.9158, 77.6492, 4.0, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'janatha@upi', 'Snacks & Sweets', '07:00 - 23:00', 12),

-- Seller 4 shops (31 to 40)
((SELECT id FROM users WHERE email='demo_seller_4@gmail.com'), 'Ahmed Kirana Shop & Soft Drinks', 'HAL 3rd Stage, Indiranagar, Bangalore 560075', 12.9660, 77.6510, 4.4, 0, 0, 'Available', 'Free drink on ₹1000', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'ahmed@upi', 'Snacks & Sweets', '07:30 - 22:30', 10),
((SELECT id FROM users WHERE email='demo_seller_4@gmail.com'), 'Sai Ram Provision Store', 'Sector 6 HSR Layout, Bangalore 560102', 12.9180, 77.6398, 4.5, 0, 0, 'Available', '5% cash back', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'sairam2@upi', 'Organic & Fresh', '08:00 - 22:00', 12),
((SELECT id FROM users WHERE email='demo_seller_4@gmail.com'), 'Goud Kiranam & General Store', 'AECS Layout, Brookefield, Bangalore 560037', 12.9630, 77.7120, 4.2, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'goud@upi', 'General Provisions', '08:00 - 22:00', 10),
((SELECT id FROM users WHERE email='demo_seller_4@gmail.com'), 'Sri Vaishnavi Kirana Store', 'Sector 2 HSR West, Bangalore 560102', 12.9110, 77.6438, 4.1, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'vaish@upi', 'General Provisions', '08:00 - 21:30', 8),
((SELECT id FROM users WHERE email='demo_seller_4@gmail.com'), 'Shivashankar Kirana & Fancy', 'HSR Club Road, Bangalore 560102', 12.9102, 77.6455, 4.3, 0, 0, 'Available', '5% off above ₹700', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'shiva@upi', 'General Provisions', '08:00 - 22:00', 10),
((SELECT id FROM users WHERE email='demo_seller_4@gmail.com'), 'Maheshwari Provision Merchant', 'Sector 5 Main HSR, Bangalore 560102', 12.9152, 77.6475, 3.9, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'mahesh2@upi', 'Groceries & Fruits', '08:00 - 22:00', 12),
((SELECT id FROM users WHERE email='demo_seller_4@gmail.com'), 'Abhiram Wholesale Kirana Shop', 'Sector 4 Commercial Rd, Bangalore 560102', 12.9182, 77.6325, 4.6, 7, 35, 'Busy', '10% flat wholesale off', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'abhiram2@upi', 'General Provisions', '08:00 - 22:00', 6),
((SELECT id FROM users WHERE email='demo_seller_4@gmail.com'), 'Durga Bhavani Kirana Store', '19th Main Rd, HSR Layout, Bangalore 560102', 12.9184, 77.6334, 4.0, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'durga2@upi', 'General Provisions', '08:00 - 21:00', 8),
((SELECT id FROM users WHERE email='demo_seller_4@gmail.com'), 'Hanuman General Store', 'Sector 3 Commercial HSR, Bangalore 560102', 12.9128, 77.6322, 4.1, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'hanuman2@upi', 'General Provisions', '08:00 - 22:00', 10),
((SELECT id FROM users WHERE email='demo_seller_4@gmail.com'), 'Sri Rama Wholesale Kirana', 'Outer Ring Rd, HSR Layout Sec 1, Bangalore 560102', 12.9238, 77.6495, 4.7, 0, 0, 'Available', 'Wholesale rates', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'srirama2@upi', 'General Provisions', '08:00 - 22:00', 15),

-- Seller 5 shops (41 to 50)
((SELECT id FROM users WHERE email='demo_seller_5@gmail.com'), 'Gopal Rao Kirana & Provisions', 'Ganesh Temple Road, HSR Sector 2, Bangalore 560102', 12.9103, 77.6445, 4.4, 0, 0, 'Available', '5% off above ₹600', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'gopal@upi', 'General Provisions', '08:00 - 22:00', 10),
((SELECT id FROM users WHERE email='demo_seller_5@gmail.com'), 'Sai Ram Wholesale Grocery Store', 'Sector 6 Market Road, Bangalore 560102', 12.9184, 77.6388, 4.5, 0, 0, 'Available', 'Wholesale prices', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'sairam3@upi', 'General Provisions', '08:00 - 22:00', 20),
((SELECT id FROM users WHERE email='demo_seller_5@gmail.com'), 'Venkateshwara Provision Stores', 'Sector 7 Market Circle, Bangalore 560102', 12.9142, 77.6416, 4.2, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'venkat2@upi', 'Groceries & Fruits', '08:00 - 22:00', 12),
((SELECT id FROM users WHERE email='demo_seller_5@gmail.com'), 'Sai Srinivasa Super Market', 'Sector 3 ORR Junction, Bangalore 560102', 12.9128, 77.6328, 4.6, 2, 8, 'Available', '8% off groceries', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'srinivasa2@upi', 'Groceries & Fruits', '08:00 - 22:00', 15),
((SELECT id FROM users WHERE email='demo_seller_5@gmail.com'), 'Tirumala Provision Stores', 'Sector 4 ORR Bypass, Bangalore 560102', 12.9192, 77.6299, 4.1, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'tirumala2@upi', 'General Provisions', '08:00 - 22:00', 10),
((SELECT id FROM users WHERE email='demo_seller_5@gmail.com'), 'Balaji General & Provision Store', 'Sector 1 Srinagar Circle, Bangalore 560102', 12.9242, 77.6525, 4.3, 0, 0, 'Available', '5% discount', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'balaji2@upi', 'General Provisions', '08:00 - 22:00', 10),
((SELECT id FROM users WHERE email='demo_seller_5@gmail.com'), 'Gandhi Kirana & Wholesale Store', 'Sector 5 Layout Road, Bangalore 560102', 12.9152, 77.6482, 4.5, 0, 0, 'Available', 'Wholesale rates', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'gandhi2@upi', 'General Provisions', '08:00 - 22:00', 15),
((SELECT id FROM users WHERE email='demo_seller_5@gmail.com'), 'Abhiram Kirana and Fancy', 'Sector 6 Srinagar Colony, Bangalore 560102', 12.9172, 77.6382, 4.0, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'abhiram3@upi', 'Snacks & Sweets', '08:00 - 21:30', 8),
((SELECT id FROM users WHERE email='demo_seller_5@gmail.com'), 'Sri Lakshmi Kirana Merchant', 'Sector 7 HSR Town Center, Bangalore 560102', 12.9145, 77.6420, 4.2, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'lakshmi2@upi', 'General Provisions', '08:00 - 22:00', 10),
((SELECT id FROM users WHERE email='demo_seller_5@gmail.com'), 'Reddy Wholesale Grocery Store', 'Sector 4 Main Road, Bangalore 560102', 12.9182, 77.6332, 4.6, 8, 40, 'Busy', '10% off above ₹1500', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'reddy2@upi', 'General Provisions', '08:00 - 22:00', 7)
ON CONFLICT DO NOTHING;
