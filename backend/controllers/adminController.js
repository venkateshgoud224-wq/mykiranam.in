const db = require('../config/db');
const socketService = require('../services/socketService');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const sellerPerformanceService = require('../services/sellerPerformanceService');
// 1. Get list of all shops/sellers for admin audits
const getSellersList = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, u.name as owner_name, u.email as owner_email, u.phone as owner_phone, u.whatsapp_number as owner_whatsapp 
       FROM shops s
       JOIN users u ON s.owner_id = u.id
       ORDER BY 
         CASE 
           WHEN s.verification_status = 'Under Review' THEN 1
           WHEN s.verification_status = 'Pending' THEN 2
           WHEN s.verification_status = 'Verified' THEN 3
           WHEN s.verification_status = 'Rejected' THEN 4
           ELSE 5
         END ASC, s.created_at DESC`
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching admin seller list:', err);
    return res.status(500).json({ error: 'Server error retrieving seller registrations.' });
  }
};

// 2. Perform Verification Action
const updateVerificationStatus = async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  const validStatuses = ['Pending', 'Under Review', 'Verified', 'Rejected', 'Suspended'];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid verification status.' });
  }

  try {
    const shopResult = await db.query('SELECT owner_id, shop_name FROM shops WHERE id = $1', [id]);
    if (shopResult.rows.length === 0) {
      return res.status(404).json({ error: 'Seller shop profile not found.' });
    }

    const shop = shopResult.rows[0];
    const isVerified = status === 'Verified';
    const verifiedByAdmin = isVerified;

    const updateResult = await db.query(
      `UPDATE shops 
       SET verification_status = $1, verified_by_admin = $2, verified = $3, 
           verification_date = CASE WHEN $3 = true THEN CURRENT_TIMESTAMP ELSE verification_date END
       WHERE id = $4 
       RETURNING *`,
      [status, verifiedByAdmin, isVerified, id]
    );

    const updatedShop = updateResult.rows[0];

    const title = 'Shop Verification Update';
    const message = `Your shop verification status has been updated to: ${status}. ${notes ? `Comment: ${notes}` : ''}`;
    const notifResult = await db.query(
      'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4) RETURNING *',
      [shop.owner_id, title, message, 'verification_update']
    );

    socketService.sendNotification(shop.owner_id, {
      ...notifResult.rows[0],
      sound: true
    });

    socketService.emitShopStatus(
      updatedShop.id,
      updatedShop.availability_status,
      updatedShop.active_orders,
      updatedShop.waiting_time
    );

    return res.status(200).json({
      message: `Shop verification successfully updated to ${status}.`,
      shop: updatedShop
    });
  } catch (err) {
    console.error('Error updating shop verification status:', err);
    return res.status(500).json({ error: 'Server error updating seller profile status.' });
  }
};

// 3. Get Platform Analytics
const getAnalytics = async (req, res) => {
  try {
    const isMock = db.getIsMock && db.getIsMock();

    let totalCustomers = 0, totalSellers = 0;
    let registrations24h = 0;
    let recentSignups = [];
    let activeLogins24h = [];
    
    let earnedToday = 0;
    let earnedLifetime = 0;
    
    let dailyViews = 0;
    let lifetimeViews = 0;

    if (!isMock) {
      // Users stats
      const customerRes = await db.query("SELECT COUNT(*) FROM users WHERE role = 'customer'");
      totalCustomers = parseInt(customerRes.rows[0].count) || 0;
      
      const sellerRes = await db.query("SELECT COUNT(*) FROM users WHERE role = 'seller'");
      totalSellers = parseInt(sellerRes.rows[0].count) || 0;

      const reg24hRes = await db.query("SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '24 HOURS'");
      registrations24h = parseInt(reg24hRes.rows[0].count) || 0;

      const signupsRes = await db.query("SELECT id, name, role, created_at FROM users ORDER BY created_at DESC LIMIT 6");
      recentSignups = signupsRes.rows;

      const loginsRes = await db.query("SELECT id, name, role, last_login FROM users WHERE last_login >= NOW() - INTERVAL '24 HOURS' ORDER BY last_login DESC");
      activeLogins24h = loginsRes.rows;

      // Revenue stats
      const revTodayRes = await db.query("SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE order_status = 'Delivered' AND created_at >= CURRENT_DATE");
      earnedToday = parseFloat(revTodayRes.rows[0].total) || 0;

      const revLifetimeRes = await db.query("SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE order_status = 'Delivered'");
      earnedLifetime = parseFloat(revLifetimeRes.rows[0].total) || 0;

      // Hits stats
      try {
        const hitsTodayRes = await db.query("SELECT count FROM platform_hits WHERE hit_date = CURRENT_DATE");
        dailyViews = hitsTodayRes.rows.length > 0 ? hitsTodayRes.rows[0].count : 0;
        
        const hitsLifetimeRes = await db.query("SELECT SUM(count) as total FROM platform_hits");
        lifetimeViews = hitsLifetimeRes.rows.length > 0 ? parseInt(hitsLifetimeRes.rows[0].total) : 0;
      } catch(e) {
        // In case platform_hits table is missing or errors
        dailyViews = 0;
        lifetimeViews = 0;
      }
    } else {
      // Mock Data (if DB is mock mode)
      const users = db.getMockDb ? db.getMockDb().users : [];
      totalCustomers = users.filter(u => u.role === 'customer').length;
      totalSellers = users.filter(u => u.role === 'seller').length;
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      registrations24h = users.filter(u => new Date(u.created_at) >= yesterday).length;
      
      recentSignups = [...users].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6);
      
      activeLogins24h = [...users].filter(u => u.last_login && new Date(u.last_login) >= yesterday).sort((a,b) => new Date(b.last_login) - new Date(a.last_login));

      const orders = db.getMockDb ? db.getMockDb().orders : [];
      const deliveredOrders = orders.filter(o => o.order_status === 'Delivered');
      
      const today = new Date();
      today.setHours(0,0,0,0);
      earnedToday = deliveredOrders.filter(o => new Date(o.created_at) >= today).reduce((sum, o) => sum + (parseFloat(o.amount)||0), 0);
      earnedLifetime = deliveredOrders.reduce((sum, o) => sum + (parseFloat(o.amount)||0), 0);
      
      dailyViews = (totalCustomers + totalSellers) * 15 + 120;
      lifetimeViews = dailyViews * 10 + 4500;
    }

    const totalCommunitySize = totalCustomers + totalSellers;
    const profileCompletionAvg = 85; // Static estimation for now

    return res.status(200).json({
      totalCustomers,
      totalSellers,
      registrations24h,
      totalCommunitySize,
      recentSignups,
      activeLogins24h,
      earnedToday,
      earnedLifetime,
      dailyViews,
      lifetimeViews,
      profileCompletionAvg
    });
    
  } catch (err) {
    console.error('Error fetching admin analytics:', err);
    return res.status(500).json({ error: 'Server error retrieving analytics data.' });
  }
};

// 4. Get Trust & Safety Dashboard
const getTrustDashboard = async (req, res) => {
  try {
    if (db.getIsMock && db.getIsMock()) {
      return res.status(200).json({
        topCustomers: [],
        highRiskCustomers: [
          { id: 1, name: "Demo User", phone: "9876543210", trust_score: 45, cancellations: 2 }
        ],
        topSellers: [],
        highComplaintSellers: [
          { id: 2, shop_name: "Mock Shop", trust_score: 60, complaint_rate: 15 }
        ],
        suspiciousActivities: [
          { id: 1, customer_name: "Suspicious User", phone: "1231231234", risk_score: "High", reason: "Multiple cancelled orders", created_at: new Date() }
        ]
      });
    }

    const topCustomers = await db.query(`
      SELECT u.id, u.name, u.phone, ct.trust_score, ct.customer_level, ct.successful_pickups 
      FROM customer_trust ct 
      JOIN users u ON ct.customer_id = u.id 
      ORDER BY ct.trust_score DESC, ct.successful_pickups DESC LIMIT 5
    `);

    const highRiskCustomers = await db.query(`
      SELECT u.id, u.name, u.phone, ct.trust_score, ct.cancellations 
      FROM customer_trust ct 
      JOIN users u ON ct.customer_id = u.id 
      WHERE ct.trust_score < 50 
      ORDER BY ct.trust_score ASC LIMIT 5
    `);

    const topSellers = await db.query(`
      SELECT s.id, s.shop_name, sp.trust_score, sp.seller_level, sp.total_completed_orders 
      FROM seller_performance sp 
      JOIN shops s ON sp.shop_id = s.id 
      ORDER BY sp.trust_score DESC, sp.total_completed_orders DESC LIMIT 5
    `);

    const highComplaintSellers = await db.query(`
      SELECT s.id, s.shop_name, sp.trust_score, sp.complaint_rate, sp.verified_complaints 
      FROM seller_performance sp 
      JOIN shops s ON sp.shop_id = s.id 
      WHERE sp.trust_score < 70 OR sp.verified_complaints > 5
      ORDER BY sp.verified_complaints DESC LIMIT 5
    `);

    const suspiciousActivities = await db.query(`
      SELECT sa.*, u.name as customer_name, u.phone 
      FROM suspicious_activities sa 
      JOIN users u ON sa.customer_id = u.id 
      ORDER BY sa.created_at DESC LIMIT 10
    `);

    return res.status(200).json({
      topCustomers: topCustomers.rows,
      highRiskCustomers: highRiskCustomers.rows,
      topSellers: topSellers.rows,
      highComplaintSellers: highComplaintSellers.rows,
      suspiciousActivities: suspiciousActivities.rows
    });
  } catch (err) {
    console.error('Error fetching trust dashboard:', err);
    return res.status(500).json({ error: 'Server error retrieving trust dashboard data.' });
  }
};

// 5. Get All Complaints
const getComplaints = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.*, u.name as customer_name, s.shop_name, o.custom_order_id
       FROM complaints c
       JOIN users u ON c.customer_id = u.id
       LEFT JOIN shops s ON c.shop_id = s.id
       LEFT JOIN orders o ON c.order_id = o.id
       ORDER BY c.created_at DESC`
    );
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching complaints:', err);
    return res.status(500).json({ error: 'Server error retrieving complaints.' });
  }
};

// 6. Verify Complaint & Apply Warning/Suspension Logic
const verifyComplaint = async (req, res) => {
  const { id } = req.params;
  const { action_notes } = req.body;

  try {
    const complaintRes = await db.query('SELECT * FROM complaints WHERE id = $1', [id]);
    if (complaintRes.rows.length === 0) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }
    const complaint = complaintRes.rows[0];

    if (complaint.is_verified) {
      return res.status(400).json({ error: 'Complaint is already verified.' });
    }

    // Mark complaint as verified
    await db.query(
      `UPDATE complaints SET is_verified = true, status = 'Verified', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    if (!complaint.shop_id) {
      return res.status(200).json({
        message: 'Complaint verified successfully (General Ticket).',
        new_verified_count: 0,
        new_warning_level: 'None',
        trust_score: 100,
        complaint_rate: 0
      });
    }

    // Recalculate seller performance
    const perf = await sellerPerformanceService.recalculateSellerPerformance(complaint.shop_id);

    // Record suspension/action history
    let reason = action_notes || `Complaint #${id} verified (Issue: ${complaint.issue_type}).`;
    await db.query(
      `INSERT INTO suspension_history (shop_id, warning_level, reason, suspended_until)
       VALUES ($1, $2, $3, $4)`,
      [complaint.shop_id, perf.warningLevel, reason, perf.suspensionEndDate]
    );

    return res.status(200).json({
      message: 'Complaint verified successfully. Seller status updated.',
      new_verified_count: perf.verifiedCount,
      new_warning_level: perf.warningLevel,
      trust_score: perf.trustScore,
      complaint_rate: perf.complaintRate
    });

  } catch (err) {
    console.error('Error verifying complaint:', err);
    return res.status(500).json({ error: 'Server error verifying complaint.' });
  }
};

const rejectComplaint = async (req, res) => {
  const { id } = req.params;

  try {
    const complaintRes = await db.query('SELECT * FROM complaints WHERE id = $1', [id]);
    if (complaintRes.rows.length === 0) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }
    const complaint = complaintRes.rows[0];

    // Mark complaint as rejected
    await db.query(
      `UPDATE complaints SET is_verified = false, status = 'Rejected', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    if (!complaint.shop_id) {
      return res.status(200).json({
        message: 'Complaint rejected successfully.',
        new_verified_count: 0,
        new_warning_level: 'None',
        trust_score: 100,
        complaint_rate: 0
      });
    }

    // Recalculate seller performance
    const perf = await sellerPerformanceService.recalculateSellerPerformance(complaint.shop_id);

    return res.status(200).json({
      message: 'Complaint rejected successfully. Seller status updated.',
      new_verified_count: perf.verifiedCount,
      new_warning_level: perf.warningLevel,
      trust_score: perf.trustScore,
      complaint_rate: perf.complaintRate
    });

  } catch (err) {
    console.error('Error rejecting complaint:', err);
    return res.status(500).json({ error: 'Server error rejecting complaint.' });
  }
};

// 7. Upload Prices CSV/Excel for Savings Engine
const uploadPricesCsv = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'File is required.' });
  }
  
  try {
    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    
    // For unsupported formats, we do not parse into database
    if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
       return res.status(200).json({ message: `Successfully uploaded ${ext} file to server storage. Database extraction not supported for this format.` });
    }

    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    if (rows.length < 2) {
       fs.unlinkSync(filePath);
       return res.status(400).json({ error: 'File is empty or invalid.' });
    }

    let importedCount = 0;
    
    await db.query('TRUNCATE TABLE products_dictionary RESTART IDENTITY');

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 4) continue;

        const getVal = (idx) => (row[idx] != null ? String(row[idx]).trim() : '');

        const productName = getVal(0);
        const category = getVal(1);
        const quantity = getVal(2);
        const originalPrice = parseFloat(getVal(3)) || 0;
        const discountedPrice = parseFloat(getVal(5)) || originalPrice;

        if (!productName || originalPrice === 0) continue;

        try {
            await db.query(
                `INSERT INTO products_dictionary (product_name, category, quantity_desc, market_price, discounted_price) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [productName, category, quantity, originalPrice, discountedPrice]
            );
            importedCount++;
        } catch (err) {
            console.error(`Error importing ${productName}:`, err.message);
        }
    }
    
    fs.unlinkSync(filePath);

    return res.status(200).json({ message: `Successfully updated ${importedCount} items in the database.` });
  } catch (err) {
    console.error('Error uploading prices file:', err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ error: 'Server error processing file.' });
  }
};

// 8. Get List of Customers
const getCustomersList = async (req, res) => {
  try {
    const isMock = db.getIsMock && db.getIsMock();
    if (!isMock) {
      const result = await db.query(
        `SELECT u.id, u.name, u.email, u.phone, u.verified_whatsapp, u.verified_email, u.created_at, u.last_login,
                COALESCE(ct.trust_score, 100) as trust_score,
                COALESCE(ct.customer_level, 'Standard Customer') as customer_level,
                COALESCE(ct.successful_pickups, 0) as successful_pickups,
                COALESCE(ct.cancellations, 0) as cancellations
         FROM users u
         LEFT JOIN customer_trust ct ON u.id = ct.customer_id
         WHERE u.role = 'customer'
         ORDER BY u.created_at DESC`
      );
      return res.status(200).json(result.rows);
    } else {
      const users = db.getMockDb ? db.getMockDb().users : [];
      const customers = users.filter(u => u.role === 'customer');
      const enriched = customers.map(u => {
        const trust = (db.getMockDb && db.getMockDb().customer_trust) ? (db.getMockDb().customer_trust[u.id] || {}) : {};
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          verified_whatsapp: u.verified_whatsapp,
          verified_email: u.verified_email,
          created_at: u.created_at,
          last_login: u.last_login,
          trust_score: trust.trust_score !== undefined ? trust.trust_score : 100,
          customer_level: trust.customer_level || 'Standard Customer',
          successful_pickups: trust.successful_pickups || 0,
          cancellations: trust.cancellations || 0
        };
      });
      enriched.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return res.status(200).json(enriched);
    }
  } catch (err) {
    console.error('Error fetching admin customers list:', err);
    return res.status(500).json({ error: 'Server error retrieving customer list.' });
  }
};

// 9. Get List of Completed/Cancelled Orders
const getCompletedOrdersList = async (req, res) => {
  try {
    const isMock = db.getIsMock && db.getIsMock();
    if (!isMock) {
      const result = await db.query(
        `SELECT o.*, s.shop_name, u.name as customer_name, u.phone as customer_phone
         FROM orders o
         JOIN shops s ON o.shop_id = s.id
         JOIN users u ON o.customer_id = u.id
         WHERE o.order_status IN ('Delivered', 'Cancelled')
         ORDER BY o.created_at DESC`
      );
      return res.status(200).json(result.rows);
    } else {
      const orders = db.getMockDb ? db.getMockDb().orders : [];
      const completed = orders.filter(o => ['Delivered', 'Cancelled'].includes(o.order_status));
      const enriched = completed.map(o => {
        const shop = db.getMockDb().shops.find(s => s.id === o.shop_id) || {};
        const customer = db.getMockDb().users.find(u => u.id === o.customer_id) || {};
        return {
          ...o,
          shop_name: shop.shop_name || 'Store',
          customer_name: customer.name || 'Customer',
          customer_phone: customer.phone || ''
        };
      });
      enriched.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return res.status(200).json(enriched);
    }
  } catch (err) {
    console.error('Error fetching admin completed orders list:', err);
    return res.status(500).json({ error: 'Server error retrieving completed orders.' });
  }
};

// 10. Get Seller KYC Details (for admin verification)
const getSellerKyc = async (req, res) => {
  const { id } = req.params; // shop ID
  try {
    const result = await db.query(
      `SELECT k.*, u.name as user_name, u.email as user_email, u.phone as user_phone
       FROM seller_kyc k
       JOIN users u ON k.seller_id = u.id
       WHERE k.shop_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No KYC submission found for this shop.', hasKyc: false });
    }

    const kyc = result.rows[0];

    // Mask Aadhaar for display (show only last 4 digits)
    if (kyc.aadhaar_number) {
      kyc.aadhaar_masked = 'XXXX-XXXX-' + kyc.aadhaar_number.slice(-4);
    }

    return res.status(200).json({ hasKyc: true, kyc });
  } catch (err) {
    console.error('Error fetching seller KYC:', err);
    return res.status(500).json({ error: 'Server error retrieving KYC details.' });
  }
};

module.exports = {
  getSellersList,
  updateVerificationStatus,
  getAnalytics,
  getTrustDashboard,
  getComplaints,
  verifyComplaint,
  rejectComplaint,
  uploadPricesCsv,
  getCustomersList,
  getCompletedOrdersList,
  getSellerKyc
};
