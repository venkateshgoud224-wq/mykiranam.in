const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const whatsappService = require('../services/whatsappService');
require('dotenv').config();

const otpStore = new Map();


const JWT_SECRET = process.env.JWT_SECRET || 'kiranam-dev-secret-key-12345';

// Helper to generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// 1. Sign Up (with Fraud Prevention uniqueness checks)
const register = async (req, res) => {
  const { name, email, password, role, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  try {
    // Fraud Prevention: Duplicate Email Detection
    const checkUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    // Fraud Prevention: Duplicate Phone Detection
    if (phone) {
      const checkPhone = await db.query('SELECT * FROM users WHERE phone = $1', [phone]);
      if (checkPhone.rows.length > 0) {
        return res.status(400).json({ error: 'An account with this mobile number already exists.' });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user (default role is 'pending' unless explicitly provided, override for venkateshgoud224@gmail.com)
    let assignedRole = role && ['customer', 'seller', 'admin', 'pending'].includes(role) ? role : 'pending';
    if (email && typeof email === 'string' && email.toLowerCase() === 'venkateshgoud224@gmail.com') {
      assignedRole = 'admin';
    }
    const result = await db.query(
      'INSERT INTO users (role, name, email, password, phone) VALUES ($1, $2, $3, $4, $5) RETURNING id, role, name, email, phone',
      [assignedRole, name, email, hashedPassword, phone || null]
    );

    const user = result.rows[0];

    // If role is customer, init customer trust
    if (user.role === 'customer') {
      await db.query('INSERT INTO customer_trust (customer_id) VALUES ($1) ON CONFLICT DO NOTHING', [user.id]);
    } else if (user.role === 'seller') {
      const defaultShopName = `${user.name}'s Kirana Store`;
      await db.query(
        'INSERT INTO shops (owner_id, shop_name, address, latitude, longitude) VALUES ($1, $2, $3, $4, $5)',
        [user.id, defaultShopName, 'Huzurnagar, Nalgonda, Telangana', 16.8970, 79.8705]
      );
    }

    // Trigger asynchronous welcome notification
    const notificationEngine = require('../services/notificationEngine');
    notificationEngine.dispatchNotification(
      user.id,
      'Welcome to Kiranam.in',
      `Namaskaram ${user.name}, thank you for registering with Kiranam.in!`,
      'signup'
    ).catch(err => console.error('Welcome notification error:', err.message));

    const token = generateToken(user);
    return res.status(201).json({ user, token });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Server error during signup.' });
  }
};

// 2. Login
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    let user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Force admin status for venkateshgoud224@gmail.com
    if (email && typeof email === 'string' && email.toLowerCase() === 'venkateshgoud224@gmail.com' && user.role !== 'admin') {
      const updateResult = await db.query(
        'UPDATE users SET role = $1 WHERE id = $2 RETURNING *',
        ['admin', user.id]
      );
      user = updateResult.rows[0];
    }

    const token = generateToken(user);
    const responseUser = { id: user.id, role: user.role, name: user.name, email: user.email, phone: user.phone, profile_image: user.profile_image };
    
    return res.status(200).json({ user: responseUser, token });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login.' });
  }
};

// 3. Google OAuth login
const googleLogin = async (req, res) => {
  const { credential, name: googleName, email: googleEmail } = req.body;

  if (!credential) {
    return res.status(400).json({ error: 'Google credential token is required.' });
  }

  try {
    let email = googleEmail || '';
    let name = googleName || '';

    if (credential.startsWith('mock_token_')) {
      const parts = credential.split('_');
      email = parts[3] || parts[2] || googleEmail || 'googleuser@kiranam.in';
      name = (typeof email === 'string' && email.includes('@')) ? email.split('@')[0] : 'GoogleUser';
      name = name.charAt(0).toUpperCase() + name.slice(1);
    } else {
      email = googleEmail || 'googleuser@kiranam.in';
      name = googleName || 'Google User';
    }

    // Check if user exists
    let result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    let user;

    if (result.rows.length === 0) {
      const mockPassword = await bcrypt.hash(Math.random().toString(36), 10);
      const initialRole = (email && typeof email === 'string' && email.toLowerCase() === 'venkateshgoud224@gmail.com') ? 'admin' : 'pending';
      const insertResult = await db.query(
        'INSERT INTO users (role, name, email, password) VALUES ($1, $2, $3, $4) RETURNING id, role, name, email, phone, profile_image',
        [initialRole, name, email, mockPassword]
      );
      user = insertResult.rows[0];
    } else {
      user = result.rows[0];
      if (email && typeof email === 'string' && email.toLowerCase() === 'venkateshgoud224@gmail.com' && user.role !== 'admin') {
        const updateResult = await db.query(
          'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, role, name, email, phone, profile_image',
          ['admin', user.id]
        );
        user = updateResult.rows[0];
      }
    }

    const token = generateToken(user);
    const responseUser = { id: user.id, role: user.role, name: user.name, email: user.email, phone: user.phone, profile_image: user.profile_image };
    
    return res.status(200).json({ user: responseUser, token });
  } catch (err) {
    console.error('Google login error:', err);
    return res.status(500).json({ error: 'Server error during Google login.' });
  }
};

// 4. Update User Role
const updateRole = async (req, res) => {
  const { role } = req.body;
  const userId = req.user.id;

  if (!role || !['customer', 'seller', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role selected.' });
  }

  try {
    const result = await db.query('UPDATE users SET role = $1 WHERE id = $2 RETURNING id, role, name, email, phone', [role, userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = result.rows[0];

    if (role === 'customer') {
      await db.query(
        'INSERT INTO customer_trust (customer_id) VALUES ($1) ON CONFLICT DO NOTHING',
        [userId]
      );
    } else if (role === 'seller') {
      const shopCheck = await db.query('SELECT * FROM shops WHERE owner_id = $1', [userId]);
      if (shopCheck.rows.length === 0) {
        const defaultShopName = `${user.name}'s Kirana Store`;
        await db.query(
          'INSERT INTO shops (owner_id, shop_name, address, latitude, longitude) VALUES ($1, $2, $3, $4, $5)',
          [userId, defaultShopName, 'Bangalore Central, Karnataka', 12.9716, 77.5946]
        );
      }
    }

    const newToken = generateToken(user);
    return res.status(200).json({ user, token: newToken });
  } catch (err) {
    console.error('Update role error:', err);
    return res.status(500).json({ error: 'Server error updating role.' });
  }
};

// 5. Get Profile Details
const getProfile = async (req, res) => {
  const userId = req.user.id;

  try {
    const userResult = await db.query(
      'SELECT id, role, name, email, phone, profile_image, whatsapp_number, verified_whatsapp, pref_browser_notif, pref_sounds, pref_whatsapp, pref_email FROM users WHERE id = $1',
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = userResult.rows[0];
    let extraData = {};

    if (user.role === 'customer') {
      const trustResult = await db.query('SELECT * FROM customer_trust WHERE customer_id = $1', [userId]);
      extraData.trustMetrics = trustResult.rows[0] || { successful_pickups: 0, cancellations: 0, no_show_count: 0 };
      
      // Calculate customer spend statistics (Delivered orders only)
      const spendMonthRes = await db.query(
        "SELECT COALESCE(SUM(amount), 0) AS spend FROM orders WHERE customer_id = $1 AND order_status = 'Delivered' AND created_at >= DATE_TRUNC('month', CURRENT_DATE)",
        [userId]
      );
      const spend3MonthsRes = await db.query(
        "SELECT COALESCE(SUM(amount), 0) AS spend FROM orders WHERE customer_id = $1 AND order_status = 'Delivered' AND created_at >= CURRENT_DATE - INTERVAL '3 months'",
        [userId]
      );
      const spendLifetimeRes = await db.query(
        "SELECT COALESCE(SUM(amount), 0) AS spend FROM orders WHERE customer_id = $1 AND order_status = 'Delivered'",
        [userId]
      );

      extraData.spendStats = {
        month: parseFloat(spendMonthRes.rows[0].spend),
        last3Months: parseFloat(spend3MonthsRes.rows[0].spend),
        lifetime: parseFloat(spendLifetimeRes.rows[0].spend)
      };
    } else if (user.role === 'seller') {
      const shopResult = await db.query('SELECT * FROM shops WHERE owner_id = $1', [userId]);
      if (shopResult.rows.length > 0) {
        const shop = shopResult.rows[0];
        extraData.shop = shop;
        
        const perfResult = await db.query('SELECT * FROM seller_performance WHERE shop_id = $1', [shop.id]);
        extraData.performanceMetrics = perfResult.rows[0] || { response_time_avg: 5, order_completion_pct: 100, cancellation_pct: 0, total_completed_orders: 0 };

        // Calculate seller detailed statistics
        const ordersCountRes = await db.query(
          "SELECT COUNT(*) AS count FROM orders WHERE shop_id = $1 AND order_status = 'Delivered'",
          [shop.id]
        );
        const revTodayRes = await db.query(
          "SELECT COALESCE(SUM(amount), 0) AS revenue FROM orders WHERE shop_id = $1 AND order_status = 'Delivered' AND created_at >= CURRENT_DATE",
          [shop.id]
        );
        const rev1WeekRes = await db.query(
          "SELECT COALESCE(SUM(amount), 0) AS revenue FROM orders WHERE shop_id = $1 AND order_status = 'Delivered' AND created_at >= CURRENT_DATE - INTERVAL '7 days'",
          [shop.id]
        );
        const rev2WeeksRes = await db.query(
          "SELECT COALESCE(SUM(amount), 0) AS revenue FROM orders WHERE shop_id = $1 AND order_status = 'Delivered' AND created_at >= CURRENT_DATE - INTERVAL '14 days'",
          [shop.id]
        );
        const rev1MonthRes = await db.query(
          "SELECT COALESCE(SUM(amount), 0) AS revenue FROM orders WHERE shop_id = $1 AND order_status = 'Delivered' AND created_at >= CURRENT_DATE - INTERVAL '30 days'",
          [shop.id]
        );
        const rev6MonthsRes = await db.query(
          "SELECT COALESCE(SUM(amount), 0) AS revenue FROM orders WHERE shop_id = $1 AND order_status = 'Delivered' AND created_at >= CURRENT_DATE - INTERVAL '6 months'",
          [shop.id]
        );
        const rev1YearRes = await db.query(
          "SELECT COALESCE(SUM(amount), 0) AS revenue FROM orders WHERE shop_id = $1 AND order_status = 'Delivered' AND created_at >= CURRENT_DATE - INTERVAL '1 year'",
          [shop.id]
        );
        const revLifetimeRes = await db.query(
          "SELECT COALESCE(SUM(amount), 0) AS revenue FROM orders WHERE shop_id = $1 AND order_status = 'Delivered'",
          [shop.id]
        );

        extraData.sellerStats = {
          completedOrdersCount: parseInt(ordersCountRes.rows[0].count),
          today: parseFloat(revTodayRes.rows[0].revenue),
          week1: parseFloat(rev1WeekRes.rows[0].revenue),
          weeks2: parseFloat(rev2WeeksRes.rows[0].revenue),
          month1: parseFloat(rev1MonthRes.rows[0].revenue),
          months6: parseFloat(rev6MonthsRes.rows[0].revenue),
          year1: parseFloat(rev1YearRes.rows[0].revenue),
          lifetime: parseFloat(revLifetimeRes.rows[0].revenue)
        };
      }
    }

    return res.status(200).json({ user, ...extraData });
  } catch (err) {
    console.error('Get profile error:', err);
    return res.status(500).json({ error: 'Server error fetching profile details.' });
  }
};

// 6. Update Notification Preferences
const updateSettings = async (req, res) => {
  const userId = req.user.id;
  const { pref_browser_notif, pref_sounds, pref_whatsapp, pref_email } = req.body;

  try {
    const result = await db.query(
      'UPDATE users SET pref_browser_notif = $1, pref_sounds = $2, pref_whatsapp = $3, pref_email = $4 WHERE id = $5 RETURNING id, pref_browser_notif, pref_sounds, pref_whatsapp, pref_email',
      [
        pref_browser_notif === true || pref_browser_notif === 'true' || pref_browser_notif === 't',
        pref_sounds === true || pref_sounds === 'true' || pref_sounds === 't',
        pref_whatsapp === true || pref_whatsapp === 'true' || pref_whatsapp === 't',
        pref_email === true || pref_email === 'true' || pref_email === 't',
        userId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.status(200).json({ message: 'Settings updated successfully.', settings: result.rows[0] });
  } catch (err) {
    console.error('Update settings error:', err);
    return res.status(500).json({ error: 'Server error updating settings.' });
  }
};

// 7. Send WhatsApp OTP
const sendWhatsAppOTP = async (req, res) => {
  const userId = req.user.id;
  const { whatsappNumber } = req.body;

  if (!whatsappNumber) {
    return res.status(400).json({ error: 'WhatsApp mobile number is required.' });
  }

  try {
    // Generate a clean 6 digit numeric code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 5 * 60 * 1000; // 5 min expiry

    // Save in memory
    otpStore.set(userId, { otp, whatsappNumber, expiry });
    
    // Dispatch OTP over WhatsApp
    await whatsappService.sendWhatsAppOTP(whatsappNumber, otp);

    // Return success, including OTP in response for easier local testing/OTP fills!
    return res.status(200).json({ 
      message: 'OTP sent to WhatsApp.', 
      whatsappNumber,
      debugOTP: otp // Expose to frontend so user has easy fallback out-of-the-box
    });
  } catch (err) {
    console.error('Send WhatsApp OTP error:', err);
    return res.status(500).json({ error: 'Server error triggering OTP.' });
  }
};

// 8. Verify WhatsApp OTP
const verifyWhatsAppOTP = async (req, res) => {
  const userId = req.user.id;
  const { otp } = req.body;

  if (!otp) {
    return res.status(400).json({ error: 'OTP code is required.' });
  }

  try {
    const record = otpStore.get(userId);

    if (!record) {
      return res.status(400).json({ error: 'No OTP request found for this user.' });
    }

    if (record.otp !== otp.trim()) {
      return res.status(400).json({ error: 'Invalid OTP code entered.' });
    }

    if (Date.now() > record.expiry) {
      otpStore.delete(userId);
      return res.status(400).json({ error: 'OTP code expired. Please request a new one.' });
    }

    // Success - save number and verify status in DB
    const result = await db.query(
      'UPDATE users SET whatsapp_number = $1, verified_whatsapp = $2, pref_whatsapp = $3 WHERE id = $4 RETURNING id, whatsapp_number, verified_whatsapp, pref_whatsapp',
      [record.whatsappNumber, true, true, userId]
    );

    // Delete OTP record
    otpStore.delete(userId);

    return res.status(200).json({ 
      message: 'WhatsApp linked and verified successfully!', 
      user: result.rows[0] 
    });
  } catch (err) {
    console.error('Verify WhatsApp OTP error:', err);
    return res.status(500).json({ error: 'Server error verifying OTP.' });
  }
};

module.exports = {
  register,
  login,
  googleLogin,
  updateRole,
  getProfile,
  updateSettings,
  sendWhatsAppOTP,
  verifyWhatsAppOTP
};
