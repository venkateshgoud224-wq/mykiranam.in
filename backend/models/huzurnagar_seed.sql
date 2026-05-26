-- Huzurnagar Real Hyperlocal Seeder SQL

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

-- 3. Seed 50 Huzurnagar Shops (Coordinates centered around Huzurnagar town 16.8970, 79.8705)
-- We will pre-verify all of these shops and assign them UPI details so the demo simulation runs smoothly.

-- Helper function to generate mock shop details (we run it locally via raw inserts or custom JS)
-- Let's execute raw INSERT statements for all 50 shops with varied locations, wait times and categories:

INSERT INTO shops (owner_id, shop_name, address, latitude, longitude, rating, active_orders, waiting_time, availability_status, discounts, verified, verification_status, verified_by_admin, verified_by_seller, verification_date, upi_id, shop_category, working_hours, max_active_orders)
VALUES
-- Seller 1 shops (1 to 10)
((SELECT id FROM users WHERE email='demo_seller_1@gmail.com'), 'Sai Srinivasa Kirana & General Store', 'Near Old Bus Stand, Huzurnagar, Suryapet, TS 508204', 16.8971, 79.8701, 4.6, 2, 10, 'Available', '5% off above ₹500', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'siva@upi', 'General Provisions', '08:00 - 22:00', 8),
((SELECT id FROM users WHERE email='demo_seller_1@gmail.com'), 'Bhaskar Kiranam & Soft Drinks', 'Kodad Road, Ramnagar, Huzurnagar, TS 508204', 16.8985, 79.8720, 4.2, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'bhaskar@upi', 'Snacks & Sweets', '07:00 - 23:00', 10),
((SELECT id FROM users WHERE email='demo_seller_1@gmail.com'), 'Venkateshwara Kirana Store', 'Indira Nagar, Huzurnagar, TS 508204', 16.8950, 79.8680, 4.0, 1, 5, 'Available', 'Free salt packet on ₹600', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'venkat@upi', 'General Provisions', '08:00 - 21:00', 6),
((SELECT id FROM users WHERE email='demo_seller_1@gmail.com'), 'Abhiram Provisions & Groceries', 'NGOs Colony, Huzurnagar, TS 508204', 16.8920, 79.8695, 3.9, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'abhiram@upi', 'Groceries & Fruits', '08:00 - 22:00', 12),
((SELECT id FROM users WHERE email='demo_seller_1@gmail.com'), 'Laxmi Prasanna Kiranam', 'Srinagar Colony, Huzurnagar, TS 508204', 16.8999, 79.8755, 4.1, 4, 25, 'Busy', '10% off on first order', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'laxmi@upi', 'General Provisions', '08:00 - 22:00', 5),
((SELECT id FROM users WHERE email='demo_seller_1@gmail.com'), 'Balaji Kirana Merchant', 'Nelamarri Road, Huzurnagar, TS 508204', 16.9015, 79.8710, 4.5, 0, 0, 'Available', '5% off above ₹1000', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'balaji@upi', 'General Provisions', '08:00 - 22:00', 15),
((SELECT id FROM users WHERE email='demo_seller_1@gmail.com'), 'Maheshwari General Store', 'Miryalaguda Road, Huzurnagar, TS 508204', 16.8912, 79.8655, 3.8, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'mahesh@upi', 'General Provisions', '08:00 - 22:00', 8),
((SELECT id FROM users WHERE email='demo_seller_1@gmail.com'), 'Sri Rama Kirana Store', 'Main Bazaar, Huzurnagar, TS 508204', 16.8968, 79.8708, 4.7, 5, 20, 'Busy', '₹50 off on bills above ₹1200', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'rama@upi', 'General Provisions', '07:30 - 22:30', 6),
((SELECT id FROM users WHERE email='demo_seller_1@gmail.com'), 'Gayatri Provision Stores', 'Lakkavaram Road, Huzurnagar, TS 508204', 16.8933, 79.8744, 4.3, 1, 8, 'Available', 'Free delivery nearby', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'gayatri@upi', 'Groceries & Fruits', '08:00 - 22:00', 10),
((SELECT id FROM users WHERE email='demo_seller_1@gmail.com'), 'Telangana Wholesale Kiranam', 'VDOs Colony, Huzurnagar, TS 508204', 16.8960, 79.8732, 4.4, 0, 0, 'Available', 'Wholesale prices', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'telangana@upi', 'General Provisions', '08:00 - 22:00', 20),

-- Seller 2 shops (11 to 20)
((SELECT id FROM users WHERE email='demo_seller_2@gmail.com'), 'Sri Raghavendra Super Market', 'Main Bazaar Road, Huzurnagar, TS 508204', 16.8972, 79.8709, 4.8, 1, 4, 'Available', '8% flat discount on groceries', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'raghav@upi', 'Groceries & Fruits', '08:00 - 22:00', 15),
((SELECT id FROM users WHERE email='demo_seller_2@gmail.com'), 'Navyasri Kiranam & Fancy Store', 'NGOs Colony Main Road, Huzurnagar, TS 508204', 16.8922, 79.8698, 4.0, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'navya@upi', 'Snacks & Sweets', '08:00 - 21:30', 8),
((SELECT id FROM users WHERE email='demo_seller_2@gmail.com'), 'Sri Vaishnavi Supermarket', 'Miryalaguda Bypass Road, Huzurnagar, TS 508204', 16.8905, 79.8660, 4.3, 3, 12, 'Available', 'Free 100g sugar on ₹500', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'vaishna@upi', 'Organic & Fresh', '08:00 - 22:00', 12),
((SELECT id FROM users WHERE email='demo_seller_2@gmail.com'), 'Tirumala Kirana & General Store', 'Kodad Cross Road, Huzurnagar, TS 508204', 16.8991, 79.8730, 4.1, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'tirumala@upi', 'General Provisions', '08:00 - 22:00', 10),
((SELECT id FROM users WHERE email='demo_seller_2@gmail.com'), 'Durga Kirana & General Store', 'Ramnagar Colony, Huzurnagar, TS 508204', 16.8988, 79.8722, 4.2, 0, 0, 'Available', '5% cash back', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'durga@upi', 'General Provisions', '08:00 - 22:00', 8),
((SELECT id FROM users WHERE email='demo_seller_2@gmail.com'), 'Hanuman Kirana Store', 'Nelamarri Cross, Huzurnagar, TS 508204', 16.9020, 79.8720, 3.7, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'hanuman@upi', 'General Provisions', '08:00 - 21:00', 6),
((SELECT id FROM users WHERE email='demo_seller_2@gmail.com'), 'Karthik Kiranam & Fancy Store', 'Srinagar Cross, Huzurnagar, TS 508204', 16.9002, 79.8760, 4.4, 0, 0, 'Available', 'Free delivery on ₹500', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'karthik@upi', 'Snacks & Sweets', '08:00 - 22:00', 10),
((SELECT id FROM users WHERE email='demo_seller_2@gmail.com'), 'Reddy Kirana & General Store', 'Ganesh Temple Street, Huzurnagar, TS 508204', 16.8955, 79.8715, 4.5, 6, 30, 'Busy', '10% off above ₹1500', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'reddy@upi', 'General Provisions', '07:30 - 22:00', 5),
((SELECT id FROM users WHERE email='demo_seller_2@gmail.com'), 'Anusha Kiranam', 'VDOs Colony Road, Huzurnagar, TS 508204', 16.8958, 79.8728, 4.0, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'anusha@upi', 'General Provisions', '08:00 - 21:30', 8),
((SELECT id FROM users WHERE email='demo_seller_2@gmail.com'), 'Pawan Wholesale Grocery', 'Cinema Hall Road, Huzurnagar, TS 508204', 16.8975, 79.8690, 4.2, 0, 0, 'Available', 'Wholesale discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'pawan@upi', 'General Provisions', '08:00 - 22:00', 25),

-- Seller 3 shops (21 to 30)
((SELECT id FROM users WHERE email='demo_seller_3@gmail.com'), 'Gandhi Kiranam & Provisions', 'Old Market, Huzurnagar, TS 508204', 16.8966, 79.8706, 4.5, 0, 0, 'Available', '5% off above ₹800', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'gandhi@upi', 'General Provisions', '08:00 - 22:00', 10),
((SELECT id FROM users WHERE email='demo_seller_3@gmail.com'), 'Sri Lakshmi Kirana and Provisions', 'Kodad Road, Huzurnagar, TS 508204', 16.8987, 79.8723, 4.3, 0, 0, 'Available', 'Free delivery', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'lakshmi@upi', 'Organic & Fresh', '08:00 - 22:00', 15),
((SELECT id FROM users WHERE email='demo_seller_3@gmail.com'), 'Jai Sri Ram Kiranam', 'Ramnagar Temple Street, Huzurnagar, TS 508204', 16.8986, 79.8718, 4.4, 0, 0, 'Available', '5% discount', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'sriram@upi', 'General Provisions', '08:00 - 22:00', 10),
((SELECT id FROM users WHERE email='demo_seller_3@gmail.com'), 'Vigneshwara Kirana Store', 'Indira Nagar Main Street, Huzurnagar, TS 508204', 16.8951, 79.8682, 4.0, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'vignesh@upi', 'General Provisions', '08:00 - 21:00', 8),
((SELECT id FROM users WHERE email='demo_seller_3@gmail.com'), 'Divya Super Market', 'NGOs Colony Park Road, Huzurnagar, TS 508204', 16.8924, 79.8699, 4.6, 1, 5, 'Available', '8% off above ₹1000', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'divya@upi', 'Groceries & Fruits', '08:00 - 22:00', 12),
((SELECT id FROM users WHERE email='demo_seller_3@gmail.com'), 'Manikantha Kirana Store', 'Nelamarri High School, Huzurnagar, TS 508204', 16.9022, 79.8718, 3.9, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'mani@upi', 'General Provisions', '08:00 - 22:00', 8),
((SELECT id FROM users WHERE email='demo_seller_3@gmail.com'), 'Srinivasa Wholesale Grocery', 'Miryalaguda Main Road, Huzurnagar, TS 508204', 16.8910, 79.8650, 4.1, 0, 0, 'Available', 'Wholesale rates', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'srinivasa@upi', 'General Provisions', '08:00 - 22:00', 20),
((SELECT id FROM users WHERE email='demo_seller_3@gmail.com'), 'Pawan Wholesale Kirana Store', 'Station Road, Huzurnagar, TS 508204', 16.8973, 79.8688, 4.3, 0, 0, 'Available', 'Wholesale items', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'pawan2@upi', 'General Provisions', '08:00 - 22:00', 15),
((SELECT id FROM users WHERE email='demo_seller_3@gmail.com'), 'Royal Kirana Store', 'Gribbs Bazaar, Huzurnagar, TS 508204', 16.8964, 79.8700, 4.2, 0, 0, 'Available', '5% off on rice', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'royal@upi', 'General Provisions', '08:00 - 22:00', 10),
((SELECT id FROM users WHERE email='demo_seller_3@gmail.com'), 'Janatha Kirana Shop', 'Bus Stand Road, Huzurnagar, TS 508204', 16.8970, 79.8703, 4.0, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'janatha@upi', 'Snacks & Sweets', '07:00 - 23:00', 12),

-- Seller 4 shops (31 to 40)
((SELECT id FROM users WHERE email='demo_seller_4@gmail.com'), 'Ahmed Kirana Shop & Soft Drinks', 'Mosque Street, Gribbs Bazaar, Huzurnagar, TS 508204', 16.8963, 79.8701, 4.4, 0, 0, 'Available', 'Free drink on ₹1000', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'ahmed@upi', 'Snacks & Sweets', '07:30 - 22:30', 10),
((SELECT id FROM users WHERE email='demo_seller_4@gmail.com'), 'Sai Ram Provision Store', 'NGOs Colony East, Huzurnagar, TS 508204', 16.8925, 79.8702, 4.5, 0, 0, 'Available', '5% cash back', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'sairam2@upi', 'Organic & Fresh', '08:00 - 22:00', 12),
((SELECT id FROM users WHERE email='demo_seller_4@gmail.com'), 'Goud Kiranam & General Store', 'Kodad Bypass Road, Huzurnagar, TS 508204', 16.8992, 79.8732, 4.2, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'goud@upi', 'General Provisions', '08:00 - 22:00', 10),
((SELECT id FROM users WHERE email='demo_seller_4@gmail.com'), 'Sri Vaishnavi Kirana Store', 'Ramnagar West, Huzurnagar, TS 508204', 16.8984, 79.8715, 4.1, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'vaish@upi', 'General Provisions', '08:00 - 21:30', 8),
((SELECT id FROM users WHERE email='demo_seller_4@gmail.com'), 'Shivashankar Kirana & Fancy', 'NGOs Main Road, Huzurnagar, TS 508204', 16.8921, 79.8696, 4.3, 0, 0, 'Available', '5% off above ₹700', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'shiva@upi', 'General Provisions', '08:00 - 22:00', 10),
((SELECT id FROM users WHERE email='demo_seller_4@gmail.com'), 'Maheshwari Provision Merchant', 'Lakkavaram Road Side, Huzurnagar, TS 508204', 16.8935, 79.8745, 3.9, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'mahesh2@upi', 'Groceries & Fruits', '08:00 - 22:00', 12),
((SELECT id FROM users WHERE email='demo_seller_4@gmail.com'), 'Abhiram Wholesale Kirana Shop', 'Old Bazaar Street, Huzurnagar, TS 508204', 16.8967, 79.8707, 4.6, 7, 35, 'Busy', '10% flat wholesale off', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'abhiram2@upi', 'General Provisions', '08:00 - 22:00', 6),
((SELECT id FROM users WHERE email='demo_seller_4@gmail.com'), 'Durga Bhavani Kirana Store', 'Srinagar Colony West, Huzurnagar, TS 508204', 16.9000, 79.8750, 4.0, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'durga2@upi', 'General Provisions', '08:00 - 21:00', 8),
((SELECT id FROM users WHERE email='demo_seller_4@gmail.com'), 'Hanuman General Store', 'Station Road North, Huzurnagar, TS 508204', 16.8976, 79.8689, 4.1, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'hanuman2@upi', 'General Provisions', '08:00 - 22:00', 10),
((SELECT id FROM users WHERE email='demo_seller_4@gmail.com'), 'Sri Rama Wholesale Kirana', 'Miryalaguda Road South, Huzurnagar, TS 508204', 16.8908, 79.8648, 4.7, 0, 0, 'Available', 'Wholesale rates', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'srirama2@upi', 'General Provisions', '08:00 - 22:00', 15),

-- Seller 5 shops (41 to 50)
((SELECT id FROM users WHERE email='demo_seller_5@gmail.com'), 'Gopal Rao Kirana & Provisions', 'Ganesh Temple Road, Huzurnagar, TS 508204', 16.8956, 79.8716, 4.4, 0, 0, 'Available', '5% off above ₹600', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'gopal@upi', 'General Provisions', '08:00 - 22:00', 10),
((SELECT id FROM users WHERE email='demo_seller_5@gmail.com'), 'Sai Ram Wholesale Grocery Store', 'Cinema Hall Road Side, Huzurnagar, TS 508204', 16.8974, 79.8692, 4.5, 0, 0, 'Available', 'Wholesale prices', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'sairam3@upi', 'General Provisions', '08:00 - 22:00', 20),
((SELECT id FROM users WHERE email='demo_seller_5@gmail.com'), 'Venkateshwara Provision Stores', 'Lakkavaram Main Road, Huzurnagar, TS 508204', 16.8931, 79.8741, 4.2, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'venkat2@upi', 'Groceries & Fruits', '08:00 - 22:00', 12),
((SELECT id FROM users WHERE email='demo_seller_5@gmail.com'), 'Sai Srinivasa Super Market', 'Bypass Road, Huzurnagar, TS 508204', 16.8902, 79.8658, 4.6, 2, 8, 'Available', '8% off groceries', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'srinivasa2@upi', 'Groceries & Fruits', '08:00 - 22:00', 15),
((SELECT id FROM users WHERE email='demo_seller_5@gmail.com'), 'Tirumala Provision Stores', 'Kodad Road Side, Huzurnagar, TS 508204', 16.8989, 79.8728, 4.1, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'tirumala2@upi', 'General Provisions', '08:00 - 22:00', 10),
((SELECT id FROM users WHERE email='demo_seller_5@gmail.com'), 'Balaji General & Provision Store', 'NGOs Colony West Side, Huzurnagar, TS 508204', 16.8923, 79.8697, 4.3, 0, 0, 'Available', '5% discount', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'balaji2@upi', 'General Provisions', '08:00 - 22:00', 10),
((SELECT id FROM users WHERE email='demo_seller_5@gmail.com'), 'Gandhi Kirana & Wholesale Store', 'Main Bazaar Street Side, Huzurnagar, TS 508204', 16.8965, 79.8705, 4.5, 0, 0, 'Available', 'Wholesale rates', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'gandhi2@upi', 'General Provisions', '08:00 - 22:00', 15),
((SELECT id FROM users WHERE email='demo_seller_5@gmail.com'), 'Abhiram Kirana and Fancy', 'Srinagar Colony Side Road, Huzurnagar, TS 508204', 16.9001, 79.8752, 4.0, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'abhiram3@upi', 'Snacks & Sweets', '08:00 - 21:30', 8),
((SELECT id FROM users WHERE email='demo_seller_5@gmail.com'), 'Sri Lakshmi Kirana Merchant', 'Nelamarri Road Side, Huzurnagar, TS 508204', 16.9017, 79.8712, 4.2, 0, 0, 'Available', 'No discounts', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'lakshmi2@upi', 'General Provisions', '08:00 - 22:00', 10),
((SELECT id FROM users WHERE email='demo_seller_5@gmail.com'), 'Reddy Wholesale Grocery Store', 'Station Road Side, Huzurnagar, TS 508204', 16.8974, 79.8687, 4.6, 8, 40, 'Busy', '10% off above ₹1500', true, 'Verified', true, true, CURRENT_TIMESTAMP, 'reddy2@upi', 'General Provisions', '08:00 - 22:00', 7)
ON CONFLICT DO NOTHING;
