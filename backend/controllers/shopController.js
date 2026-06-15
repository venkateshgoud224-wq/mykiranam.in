const db = require('../config/db');
const socketService = require('../services/socketService');
const { uploadImage } = require('../services/storageService');
const emailService = require('../services/emailService');

// Haversine Distance Formula (Returns Distance in Kilometers)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
      
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Fraud Prevention: Coordinates duplication checker (flags matches within 10 meters)
const checkLocationDuplicate = async (lat, lng, currentShopId = null) => {
  try {
    const result = await db.query('SELECT id, latitude, longitude, shop_name FROM shops');
    for (const shop of result.rows) {
      if (currentShopId && Number(shop.id) === Number(currentShopId)) continue;
      const distance = calculateDistance(lat, lng, parseFloat(shop.latitude), parseFloat(shop.longitude));
      if (distance <= 0.01) { // 0.01 km = 10 meters
        return shop.shop_name;
      }
    }
    return null;
  } catch (err) {
    console.error('Error during location duplication check:', err);
    return null;
  }
};

// 1. Get List of Shops (Filtered to show ONLY Verified stores for customers)
const getShops = async (req, res) => {
  const { lat, lng, sort, filterAvailable, filterVerified, filterNearby } = req.query;

  const customerLat = lat ? parseFloat(lat) : 12.9716;
  const customerLng = lng ? parseFloat(lng) : 77.5946;

  try {
    // Phase 2 Rule: Query only VERIFIED shops that are not suspended (Warning 5)
    const result = await db.query(
      `SELECT s.*, 
              COALESCE(sp.trust_score, 100) as seller_trust_score,
              COALESCE(sp.seller_level, 'Standard Seller') as seller_level,
              COALESCE(sp.complaint_rate, 0.00) as complaint_rate,
              COALESCE(sp.verified_complaints, 0) as verified_complaints
       FROM shops s
       LEFT JOIN seller_performance sp ON s.id = sp.shop_id
       WHERE s.verification_status = 'Verified' AND (s.warning_level IS NULL OR s.warning_level != 'Warning 5')`
    );
    let shops = result.rows.map(shop => {
      const distance = calculateDistance(
        customerLat,
        customerLng,
        parseFloat(shop.latitude),
        parseFloat(shop.longitude)
      );
      return {
        ...shop,
        distance: parseFloat(distance.toFixed(2))
      };
    });

    // Apply filters
    if (filterAvailable === 'true') {
      shops = shops.filter(s => s.availability_status === 'Available');
    }
    if (filterVerified === 'true') {
      shops = shops.filter(s => s.verified === true);
    }
    if (filterNearby === 'true') {
      shops = shops.filter(s => s.distance <= 5.0);
    }

    // Warning level rank penalty helper (Warning 3 & 4 appear lower)
    const warningPenalty = (shop) => {
      return (shop.warning_level === 'Warning 3' || shop.warning_level === 'Warning 4') ? 1 : 0;
    };

    // Helper to wrap comparisons with the warning level penalty
    const penalizeAndSort = (a, b, compareFn) => {
      const penaltyA = warningPenalty(a);
      const penaltyB = warningPenalty(b);
      if (penaltyA !== penaltyB) return penaltyA - penaltyB;
      return compareFn(a, b);
    };

    // Apply sorting
    const statusWeight = (status) => {
      if (status === 'Available') return 0;
      if (status === 'Busy') return 1;
      return 2;
    };

    if (sort === 'nearest') {
      shops.sort((a, b) => penalizeAndSort(a, b, (x, y) => x.distance - y.distance));
    } else if (sort === 'rating') {
      shops.sort((a, b) => penalizeAndSort(a, b, (x, y) => y.rating - x.rating));
    } else if (sort === 'response_time') {
      shops.sort((a, b) => penalizeAndSort(a, b, (x, y) => x.average_response_time - y.average_response_time));
    } else if (sort === 'waiting_time') {
      shops.sort((a, b) => penalizeAndSort(a, b, (x, y) => x.waiting_time - y.waiting_time));
    } else if (sort === 'discounts') {
      shops.sort((a, b) => penalizeAndSort(a, b, (x, y) => {
        const hasA = x.discounts && x.discounts !== 'No discounts' ? 1 : 0;
        const hasB = y.discounts && y.discounts !== 'No discounts' ? 1 : 0;
        return hasB - hasA;
      }));
    } else if (sort === 'available') {
      shops.sort((a, b) => penalizeAndSort(a, b, (x, y) => statusWeight(x.availability_status) - statusWeight(y.availability_status)));
    } else {
      // Default Queue Balanced Sorting
      shops.sort((a, b) => penalizeAndSort(a, b, (x, y) => {
        const statA = statusWeight(x.availability_status);
        const statB = statusWeight(y.availability_status);
        if (statA !== statB) return statA - statB;
        if (x.active_orders !== y.active_orders) return x.active_orders - y.active_orders;
        if (x.waiting_time !== y.waiting_time) return x.waiting_time - y.waiting_time;
        if (Math.abs(x.distance - y.distance) > 0.1) return x.distance - y.distance;
        return y.rating - x.rating;
      }));
    }

    return res.status(200).json(shops);
  } catch (err) {
    console.error('Error fetching shops:', err);
    return res.status(500).json({ error: 'Server error retrieving shops listing.' });
  }
};

// 2. Get Shop Details
const getShopById = async (req, res) => {
  const { id } = req.params;

  if (isNaN(id)) {
    return res.status(404).json({ error: 'Shop not found.' });
  }

  try {
    const shopResult = await db.query('SELECT * FROM shops WHERE id = $1', [id]);
    if (shopResult.rows.length === 0) {
      return res.status(404).json({ error: 'Shop not found.' });
    }

    const shop = shopResult.rows[0];
    const ownerResult = await db.query('SELECT phone, name FROM users WHERE id = $1', [shop.owner_id]);
    const owner = ownerResult.rows[0] || {};
    shop.owner_phone = owner.phone;
    shop.owner_name = owner.name;

    return res.status(200).json(shop);
  } catch (err) {
    console.error('Error fetching shop details:', err);
    return res.status(500).json({ error: 'Server error retrieving shop.' });
  }
};

// 3. Get Shop associated with current logged-in seller
const getMyShop = async (req, res) => {
  const sellerId = req.user.id;

  try {
    let shopResult = await db.query('SELECT * FROM shops WHERE owner_id = $1', [sellerId]);
    if (shopResult.rows.length === 0) {
      // Auto-create a default shop profile for this seller
      const defaultShopName = `${req.user.name}'s Kirana Store`;
      await db.query(
        'INSERT INTO shops (owner_id, shop_name, address, latitude, longitude, verified, verification_status, verified_by_admin, verified_by_seller, verification_date) VALUES ($1, $2, $3, $4, $5, true, \'Verified\', true, true, CURRENT_TIMESTAMP)',
        [sellerId, defaultShopName, 'Huzurnagar, Nalgonda, Telangana', 16.8970, 79.8705]
      );
      shopResult = await db.query('SELECT * FROM shops WHERE owner_id = $1', [sellerId]);
    }
    return res.status(200).json(shopResult.rows[0]);
  } catch (err) {
    console.error('Error fetching seller shop:', err);
    return res.status(500).json({ error: 'Server error retrieving seller shop.' });
  }
};

// 4. Update Shop Settings (including coordinates fraud duplicate location blocker)
const updateShopSettings = async (req, res) => {
  const sellerId = req.user.id;
    const {
      shop_name,
      address,
      latitude,
      longitude,
      availability_status,
      max_active_orders,
      waiting_time,
      discounts,
      online_start_time,
      online_end_time,
      working_hours,
      shop_category,
      delivery_option,
      delivery_charges,
      delivery_time,
      home_delivery_ready,
      catalog_enabled
    } = req.body;
  
    try {
      const shopCheck = await db.query('SELECT * FROM shops WHERE owner_id = $1', [sellerId]);
      if (shopCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Shop not found for this seller.' });
      }
      const shop = shopCheck.rows[0];
  
      const newLat = latitude ? parseFloat(latitude) : parseFloat(shop.latitude);
      const newLng = longitude ? parseFloat(longitude) : parseFloat(shop.longitude);
  
      // Fraud check: block duplicate coordinates
      if (latitude || longitude) {
        const duplicateShopName = await checkLocationDuplicate(newLat, newLng, shop.id);
        if (duplicateShopName) {
          return res.status(400).json({
            error: `Fraud coordinates flagged. Coordinates match too closely with registered shop: "${duplicateShopName}".`
          });
        }
      }
  
      const newShopName = shop_name || shop.shop_name;
      const newAddress = address || shop.address;
      const newStatus = availability_status || shop.availability_status;
      const newMaxActive = (max_active_orders !== undefined && max_active_orders !== '') ? parseInt(max_active_orders) : shop.max_active_orders;
      const newWait = (waiting_time !== undefined && waiting_time !== '') ? parseInt(waiting_time) : shop.waiting_time;
      const newDiscounts = discounts !== undefined ? discounts : shop.discounts;
      const newStart = online_start_time || shop.online_start_time;
      const newEnd = online_end_time || shop.online_end_time;
      const newHours = working_hours || shop.working_hours;
      const newCategory = shop_category || shop.shop_category;
      
      const newDeliveryOption = delivery_option || shop.delivery_option || 'Pickup Only';
      const newDeliveryCharges = (delivery_charges !== undefined && delivery_charges !== '') ? parseFloat(delivery_charges) : (shop.delivery_charges || 0.00);
      const newDeliveryTime = delivery_time !== undefined ? delivery_time : (shop.delivery_time || '');
      const newHomeDeliveryReady = home_delivery_ready !== undefined ? (home_delivery_ready === true || home_delivery_ready === 'true') : (shop.home_delivery_ready || false);
      const newCatalogEnabled = catalog_enabled !== undefined ? (catalog_enabled === true || catalog_enabled === 'true') : (shop.catalog_enabled !== false);
  
      const result = await db.query(
        `UPDATE shops 
         SET shop_name = $1, address = $2, latitude = $3, longitude = $4, availability_status = $5, 
             max_active_orders = $6, waiting_time = $7, discounts = $8, online_start_time = $9, online_end_time = $10,
             working_hours = $11, shop_category = $12, delivery_option = $13, delivery_charges = $14, delivery_time = $15,
             home_delivery_ready = $16, catalog_enabled = $17
         WHERE id = $18 
         RETURNING *`,
        [newShopName, newAddress, newLat, newLng, newStatus, newMaxActive, newWait, newDiscounts, newStart, newEnd, newHours, newCategory, newDeliveryOption, newDeliveryCharges, newDeliveryTime, newHomeDeliveryReady, newCatalogEnabled, shop.id]
      );

    const updatedShop = result.rows[0];

    socketService.emitShopStatus(
      updatedShop.id,
      updatedShop.availability_status,
      updatedShop.active_orders,
      updatedShop.waiting_time
    );

    return res.status(200).json(updatedShop);
  } catch (err) {
    console.error('Error updating shop settings:', err);
    return res.status(500).json({ error: 'Server error updating shop settings.' });
  }
};

// 5. Update Shop UPI Information & QR Code
const updateShopPayment = async (req, res) => {
  const sellerId = req.user.id;
  const { upi_id } = req.body;
  const file = req.file;

  try {
    const shopCheck = await db.query('SELECT * FROM shops WHERE owner_id = $1', [sellerId]);
    if (shopCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Shop not found for this seller.' });
    }
    const shop = shopCheck.rows[0];

    let qrCodeUrl = shop.qr_code_image;

    if (file) {
      qrCodeUrl = await uploadImage(file);
    }

    const result = await db.query(
      'UPDATE shops SET upi_id = $1, qr_code_image = $2 WHERE id = $3 RETURNING *',
      [upi_id || shop.upi_id, qrCodeUrl, shop.id]
    );

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error updating shop payment settings:', err);
    return res.status(500).json({ error: 'Server error updating payment configurations.' });
  }
};

// --- PHASE 2 VERIFICATION CONTROLS ---

// OTP Simulation memory
const activeOtps = new Map(); // phone -> OTP code

// Send Email verification OTP
const sendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  // Generate a random 4-digit code
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  activeOtps.set(email, code);
  
  console.log(`✉️ [EMAIL OTP SIMULATOR] Code for ${email} is: ${code}`);

  try {
    await emailService.sendAccountVerificationEmail(email, code);
  } catch (err) {
    console.error('Error dispatching verification email:', err);
  }

  return res.status(200).json({
    message: 'Verification OTP code has been sent to your email.'
  });
};

// Verify Email OTP
const verifyOtp = async (req, res) => {
  const { email, code } = req.body;
  const sellerId = req.user.id;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and OTP code are required.' });
  }

  const expectedCode = activeOtps.get(email);
  if (expectedCode === code) {
    // Success: mark email as verified by seller
    activeOtps.delete(email);
    await db.query('UPDATE shops SET verified_by_seller = true WHERE owner_id = $1', [sellerId]);
    await db.query('UPDATE users SET verified_email = true WHERE id = $1', [sellerId]);
    return res.status(200).json({ success: true, message: 'Email verification successful.' });
  } else {
    return res.status(400).json({ error: 'Invalid verification OTP code. Please retry.' });
  }
};

// Upload 5 verification images and submit shop for Under Review status
const verifyShop = async (req, res) => {
  const sellerId = req.user.id;
  const files = req.files; // Multer uploads object
  const { working_hours, shop_category, shop_name, address, latitude, longitude } = req.body;

  if (!files || !files.image_front || !files.image_counter || !files.image_inside1 || !files.image_inside2 || !files.image_additional) {
    return res.status(400).json({ error: 'All 5 mandatory shop images are required.' });
  }

  try {
    let shopCheck = await db.query('SELECT * FROM shops WHERE owner_id = $1', [sellerId]);
    if (shopCheck.rows.length === 0) {
      // Auto-create missing shop profile
      const defaultShopName = `${req.user.name}'s Kirana Store`;
      await db.query(
        'INSERT INTO shops (owner_id, shop_name, address, latitude, longitude, verified, verification_status, verified_by_admin, verified_by_seller, verification_date) VALUES ($1, $2, $3, $4, $5, true, \'Verified\', true, true, CURRENT_TIMESTAMP)',
        [sellerId, defaultShopName, 'Huzurnagar, Nalgonda, Telangana', 16.8970, 79.8705]
      );
      shopCheck = await db.query('SELECT * FROM shops WHERE owner_id = $1', [sellerId]);
    }
    const shop = shopCheck.rows[0];

    const newLat = latitude ? parseFloat(latitude) : parseFloat(shop.latitude);
    const newLng = longitude ? parseFloat(longitude) : parseFloat(shop.longitude);

    // Coordinate duplication check
    if (latitude || longitude) {
      const duplicateShopName = await checkLocationDuplicate(newLat, newLng, shop.id);
      if (duplicateShopName) {
        return res.status(400).json({
          error: `Fraud coordinates flagged. Coordinates match too closely with registered shop: "${duplicateShopName}".`
        });
      }
    }

    // Upload all 5 files to Storage
    const imgFront = await uploadImage(files.image_front[0]);
    const imgCounter = await uploadImage(files.image_counter[0]);
    const imgInside1 = await uploadImage(files.image_inside1[0]);
    const imgInside2 = await uploadImage(files.image_inside2[0]);
    const imgAdd = await uploadImage(files.image_additional[0]);

    // Update shop verification status to Under Review
    const result = await db.query(
      `UPDATE shops 
       SET verification_status = 'Under Review', verified_by_seller = true,
           working_hours = $1, shop_category = $2,
           image_front = $3, image_counter = $4, image_inside1 = $5, image_inside2 = $6, image_additional = $7,
           shop_name = $8, address = $9, latitude = $10, longitude = $11
       WHERE id = $12 
       RETURNING *`,
      [
        working_hours || shop.working_hours, 
        shop_category || shop.shop_category,
        imgFront, imgCounter, imgInside1, imgInside2, imgAdd,
        shop_name || shop.shop_name,
        address || shop.address,
        newLat,
        newLng,
        shop.id
      ]
    );

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error during shop verification submit:', err);
    return res.status(500).json({ error: 'Server error processing verification uploads.' });
  }
};

// 6. Update Shop Banner Image
const updateShopBanner = async (req, res) => {
  const sellerId = req.user.id;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'Please select an image file to upload as banner.' });
  }

  try {
    const shopCheck = await db.query('SELECT * FROM shops WHERE owner_id = $1', [sellerId]);
    if (shopCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Shop not found for this seller.' });
    }
    const shop = shopCheck.rows[0];

    const bannerUrl = await uploadImage(file);

    const result = await db.query(
      'UPDATE shops SET image_banner = $1 WHERE id = $2 RETURNING *',
      [bannerUrl, shop.id]
    );

    const updatedShop = result.rows[0];

    socketService.emitShopStatus(
      updatedShop.id,
      updatedShop.availability_status,
      updatedShop.active_orders,
      updatedShop.waiting_time,
      updatedShop.image_banner
    );

    return res.status(200).json(updatedShop);
  } catch (err) {
    console.error('Error updating shop banner settings:', err);
    return res.status(500).json({ error: 'Server error updating banner configurations.' });
  }
};

// 7. Get Premium Analytics for Shop (Phase 8 Premium Strategy)
const getPremiumAnalytics = async (req, res) => {
  const sellerId = req.user.id;

  try {
    const shopCheck = await db.query('SELECT * FROM shops WHERE owner_id = $1', [sellerId]);
    if (shopCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Shop not found for this seller.' });
    }
    const shop = shopCheck.rows[0];

    // Mock Premium Analytics Data for Wow Factor
    const mockData = {
      totalCatalogItems: 342,
      revenueTrend: '+12.5%',
      lostRevenueEstimate: 4500,
      comparisons: [
        { id: 1, item_name: 'Aashirvaad Atta (5kg)', my_price: 260, market_avg: 245, status: 'Too High' },
        { id: 2, item_name: 'Tata Salt (1kg)', my_price: 25, market_avg: 25, status: 'Optimal' },
        { id: 3, item_name: 'Sugar (1kg)', my_price: 45, market_avg: 41, status: 'Too High' },
        { id: 4, item_name: 'Toor Dal (1kg)', my_price: 155, market_avg: 160, status: 'Competitive' },
        { id: 5, item_name: 'Fortune Sunflower Oil (1L)', my_price: 130, market_avg: 125, status: 'Too High' },
        { id: 6, item_name: 'Maggi Noodles (140g)', my_price: 28, market_avg: 30, status: 'Competitive' },
        { id: 7, item_name: 'Surf Excel Matic (1kg)', my_price: 220, market_avg: 210, status: 'Too High' },
      ],
      monthlyRevenue: [
        { month: 'Jan', revenue: 45000 },
        { month: 'Feb', revenue: 52000 },
        { month: 'Mar', revenue: 48000 },
        { month: 'Apr', revenue: 61000 },
        { month: 'May', revenue: 59000 },
        { month: 'Jun', revenue: 68000 },
      ]
    };

    return res.status(200).json(mockData);
  } catch (err) {
    console.error('Error fetching premium analytics:', err);
    return res.status(500).json({ error: 'Server error retrieving premium analytics.' });
  }
};


module.exports = {
  getShops,
  getShopById,
  getMyShop,
  updateShopSettings,
  updateShopPayment,
  sendOtp,
  verifyOtp,
  verifyShop,
  updateShopBanner,
  getPremiumAnalytics
};

