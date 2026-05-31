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
    // Phase 2 Rule: Query only VERIFIED shops
    const result = await db.query("SELECT * FROM shops WHERE verification_status = 'Verified'");
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

    // Apply sorting
    const statusWeight = (status) => {
      if (status === 'Available') return 0;
      if (status === 'Busy') return 1;
      return 2;
    };

    if (sort === 'nearest') {
      shops.sort((a, b) => a.distance - b.distance);
    } else if (sort === 'rating') {
      shops.sort((a, b) => b.rating - a.rating);
    } else if (sort === 'waiting_time') {
      shops.sort((a, b) => a.waiting_time - b.waiting_time);
    } else if (sort === 'discounts') {
      shops.sort((a, b) => {
        const hasA = a.discounts && a.discounts !== 'No discounts' ? 1 : 0;
        const hasB = b.discounts && b.discounts !== 'No discounts' ? 1 : 0;
        return hasB - hasA;
      });
    } else if (sort === 'available') {
      shops.sort((a, b) => statusWeight(a.availability_status) - statusWeight(b.availability_status));
    } else {
      // Default Queue Balanced Sorting
      shops.sort((a, b) => {
        const statA = statusWeight(a.availability_status);
        const statB = statusWeight(b.availability_status);
        if (statA !== statB) return statA - statB;
        if (a.active_orders !== b.active_orders) return a.active_orders - b.active_orders;
        if (a.waiting_time !== b.waiting_time) return a.waiting_time - b.waiting_time;
        if (Math.abs(a.distance - b.distance) > 0.1) return a.distance - b.distance;
        return b.rating - a.rating;
      });
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
        'INSERT INTO shops (owner_id, shop_name, address, latitude, longitude) VALUES ($1, $2, $3, $4, $5)',
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
    shop_category
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

    const result = await db.query(
      `UPDATE shops 
       SET shop_name = $1, address = $2, latitude = $3, longitude = $4, availability_status = $5, 
           max_active_orders = $6, waiting_time = $7, discounts = $8, online_start_time = $9, online_end_time = $10,
           working_hours = $11, shop_category = $12
       WHERE id = $13 
       RETURNING *`,
      [newShopName, newAddress, newLat, newLng, newStatus, newMaxActive, newWait, newDiscounts, newStart, newEnd, newHours, newCategory, shop.id]
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
    return res.status(200).json({ success: true, message: 'Email verification successful.' });
  } else {
    return res.status(400).json({ error: 'Invalid verification OTP code. Please retry.' });
  }
};

// Upload 5 verification images and submit shop for Under Review status
const verifyShop = async (req, res) => {
  const sellerId = req.user.id;
  const files = req.files; // Multer uploads object
  const { working_hours, shop_category } = req.body;

  if (!files || !files.image_front || !files.image_counter || !files.image_inside1 || !files.image_inside2 || !files.image_additional) {
    return res.status(400).json({ error: 'All 5 mandatory shop images are required.' });
  }

  try {
    let shopCheck = await db.query('SELECT * FROM shops WHERE owner_id = $1', [sellerId]);
    if (shopCheck.rows.length === 0) {
      // Auto-create missing shop profile
      const defaultShopName = `${req.user.name}'s Kirana Store`;
      await db.query(
        'INSERT INTO shops (owner_id, shop_name, address, latitude, longitude) VALUES ($1, $2, $3, $4, $5)',
        [sellerId, defaultShopName, 'Huzurnagar, Nalgonda, Telangana', 16.8970, 79.8705]
      );
      shopCheck = await db.query('SELECT * FROM shops WHERE owner_id = $1', [sellerId]);
    }
    const shop = shopCheck.rows[0];

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
           image_front = $3, image_counter = $4, image_inside1 = $5, image_inside2 = $6, image_additional = $7
       WHERE id = $8 
       RETURNING *`,
      [
        working_hours || shop.working_hours, 
        shop_category || shop.shop_category,
        imgFront, imgCounter, imgInside1, imgInside2, imgAdd,
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

module.exports = {
  getShops,
  getShopById,
  getMyShop,
  updateShopSettings,
  updateShopPayment,
  sendOtp,
  verifyOtp,
  verifyShop,
  updateShopBanner
};
