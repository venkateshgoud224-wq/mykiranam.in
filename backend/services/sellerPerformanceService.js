const db = require('../config/db');
const socketService = require('./socketService');
const notificationEngine = require('./notificationEngine');

const COMPLAINT_POINTS = {
  'Wrong Product': 5,
  'Missing Product': 5,
  'Expired Product': 15,
  'Poor Quality Product': 10,
  'Poor Quality': 10,
  'Price Mismatch': 10,
  'Order Not Ready For Pickup': 5,
  'Order Not Ready': 5,
  'Fake Availability': 10,
  'Seller Misbehavior': 15,
  'Incorrect Quantity': 5,
  'Other Verified Issues': 5,
  'Other': 5,
  'Damaged Product': 10
};

/**
 * Calculates and updates seller performance metrics in PostgreSQL or In-Memory mockDb
 */
const recalculateSellerPerformance = async (shopId) => {
  try {
    const isMock = db.getIsMock && db.getIsMock();
    
    let totalOrders = 0;
    let completedOrders = 0;
    let verifiedComplaints = [];
    let recentVerifiedComplaints30Days = 0;
    
    if (isMock) {
      const mockDb = db.getMockDb();
      const shopOrders = mockDb.orders.filter(o => Number(o.shop_id) === Number(shopId));
      totalOrders = shopOrders.length;
      completedOrders = shopOrders.filter(o => o.order_status === 'Delivered').length;
      
      verifiedComplaints = (mockDb.complaints || []).filter(c => Number(c.shop_id) === Number(shopId) && c.is_verified === true);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      recentVerifiedComplaints30Days = verifiedComplaints.filter(c => new Date(c.created_at) >= thirtyDaysAgo).length;
    } else {
      // Postgres queries
      const ordersRes = await db.query(
        `SELECT COUNT(*) as total, COUNT(CASE WHEN order_status = 'Delivered' THEN 1 END) as completed 
         FROM orders WHERE shop_id = $1`,
        [shopId]
      );
      totalOrders = parseInt(ordersRes.rows[0].total) || 0;
      completedOrders = parseInt(ordersRes.rows[0].completed) || 0;
      
      const complaintsRes = await db.query(
        `SELECT id, issue_type, created_at FROM complaints WHERE shop_id = $1 AND is_verified = true`,
        [shopId]
      );
      verifiedComplaints = complaintsRes.rows;
      
      const recentRes = await db.query(
        `SELECT COUNT(*) as count FROM complaints 
         WHERE shop_id = $1 AND is_verified = true AND created_at >= NOW() - INTERVAL '30 days'`,
        [shopId]
      );
      recentVerifiedComplaints30Days = parseInt(recentRes.rows[0].count) || 0;
    }
    
    // Calculate trust score deductions
    let deductions = 0;
    verifiedComplaints.forEach(c => {
      const points = COMPLAINT_POINTS[c.issue_type] || 5;
      deductions += points;
    });
    
    // Calculate recovery additions
    let additions = 0;
    if (completedOrders >= 100) {
      additions += 5;
    } else if (completedOrders >= 50) {
      additions += 2;
    }
    
    if (recentVerifiedComplaints30Days === 0) {
      additions += 5;
    }
    
    // Calculate final trust score (default 100, bounded [0, 100])
    let trustScore = 100 - deductions + additions;
    trustScore = Math.max(0, Math.min(100, trustScore));
    
    // Calculate complaint rate: Verified Complaints ÷ Total Orders × 100
    const complaintRate = totalOrders > 0 ? parseFloat(((verifiedComplaints.length / totalOrders) * 100).toFixed(2)) : 0.00;
    
    // Warning and suspension logic based on verified complaint count
    let warningLevel = 'None';
    let suspensionEndDate = null;
    const verifiedCount = verifiedComplaints.length;
    
    if (verifiedCount >= 11) {
      warningLevel = 'Warning 5'; // Temporary Store Suspension
      const date = new Date();
      date.setDate(date.getDate() + 30); // 30 days default suspension
      suspensionEndDate = date;
    } else if (verifiedCount >= 10) {
      warningLevel = 'Warning 4'; // Store placed under review. Admin investigation required.
    } else if (verifiedCount >= 7) {
      warningLevel = 'Warning 3'; // Store ranking reduced. Store appears lower in search results.
    } else if (verifiedCount >= 5) {
      warningLevel = 'Warning 2'; // Trust score reduced. Seller notified.
    } else if (verifiedCount >= 3) {
      warningLevel = 'Warning 1'; // Send warning notification. Message: "Please improve product quality and order fulfillment standards."
    }
    
    // Apply changes to database
    if (isMock) {
      const mockDb = db.getMockDb();
      const shop = mockDb.shops.find(s => Number(s.id) === Number(shopId));
      if (shop) {
        shop.verified_complaints_count = verifiedCount;
        shop.warning_level = warningLevel;
        shop.suspension_end_date = suspensionEndDate;
        if (warningLevel === 'Warning 5') {
          shop.availability_status = 'Offline';
        }
        db.markMockDbDirty();
      }
      
      let perf = mockDb.seller_performance[shopId];
      if (!perf) {
        perf = { shop_id: Number(shopId) };
        mockDb.seller_performance[shopId] = perf;
      }
      perf.trust_score = trustScore;
      perf.complaint_rate = complaintRate;
      perf.verified_complaints = verifiedCount;
      perf.total_completed_orders = completedOrders;
      db.markMockDbDirty();
    } else {
      // Postgres updates
      // Update shops table
      await db.query(
        `UPDATE shops 
         SET verified_complaints_count = $1, warning_level = $2, suspension_end_date = $3,
             availability_status = CASE WHEN $2 = 'Warning 5' THEN 'Offline'::varchar ELSE availability_status END
         WHERE id = $4`,
        [verifiedCount, warningLevel, suspensionEndDate, shopId]
      );
      
      // Update/Insert seller_performance table
      await db.query(
        `INSERT INTO seller_performance (shop_id, trust_score, complaint_rate, verified_complaints, total_completed_orders)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (shop_id) 
         DO UPDATE SET 
           trust_score = $2,
           complaint_rate = $3,
           verified_complaints = $4,
           total_completed_orders = $5`,
        [shopId, trustScore, complaintRate, verifiedCount, completedOrders]
      );
    }
    
    // Trigger real-time status update to seller
    const shopRes = isMock 
      ? { rows: [db.getMockDb().shops.find(s => Number(s.id) === Number(shopId))] }
      : await db.query('SELECT owner_id, shop_name, warning_level, availability_status, active_orders, waiting_time FROM shops WHERE id = $1', [shopId]);
      
    if (shopRes.rows.length > 0 && shopRes.rows[0]) {
      const shop = shopRes.rows[0];
      
      socketService.emitShopStatus(shopId, shop.availability_status, shop.active_orders, shop.waiting_time);
      
      // Handle warning/suspension notifications and sockets
      if (warningLevel !== 'None') {
        let message = '';
        if (warningLevel === 'Warning 1') {
          message = 'Please improve product quality and order fulfillment standards. You have received Warning 1 due to 3 verified customer complaints.';
        } else if (warningLevel === 'Warning 2') {
          message = 'Your Seller Trust Score has been reduced. You have received Warning 2 due to 5 verified customer complaints. Please review customer complaints immediately.';
        } else if (warningLevel === 'Warning 3') {
          message = 'Your Store ranking has been reduced. Your shop will appear lower in search results due to Warning 3 (7 verified complaints).';
        } else if (warningLevel === 'Warning 4') {
          message = 'Your store has been placed Under Review. Admin investigation is required. You have received Warning 4 due to 10 verified complaints.';
        } else if (warningLevel === 'Warning 5') {
          message = 'Your store has been Temporarily Suspended. You cannot receive new orders. Please contact support immediately. Warning 5 due to repeated verified complaints.';
        }
        
        await notificationEngine.dispatchNotification(
          shop.owner_id,
          `Seller Account Strike: ${warningLevel}`,
          message,
          'seller_warning',
          {
            shopId: shopId,
            warningLevel: warningLevel,
            trustScore: trustScore,
            complaintRate: complaintRate
          }
        );
      }
    }
    
    return {
      trustScore,
      complaintRate,
      verifiedCount,
      warningLevel,
      suspensionEndDate
    };
  } catch (err) {
    console.error(`Error recalculating seller performance for shop ${shopId}:`, err);
    throw err;
  }
};

module.exports = {
  recalculateSellerPerformance,
  COMPLAINT_POINTS
};
