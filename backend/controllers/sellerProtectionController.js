const db = require('../config/db');
const notificationEngine = require('../services/notificationEngine');

// Seller blocks a customer
const blockCustomer = async (req, res) => {
  const sellerId = req.user.id;
  const { customer_id, reason } = req.body;

  if (!customer_id) {
    return res.status(400).json({ error: 'Customer ID is required.' });
  }

  try {
    await db.query(
      `INSERT INTO seller_customer_blocks (seller_id, customer_id, reason) 
       VALUES ($1, $2, $3)
       ON CONFLICT (seller_id, customer_id) DO NOTHING`,
      [sellerId, customer_id, reason || 'No reason provided']
    );

    return res.status(200).json({ message: 'Customer blocked successfully.' });
  } catch (err) {
    console.error('Block customer error:', err);
    return res.status(500).json({ error: 'Server error blocking customer.' });
  }
};

// Seller reports a customer
const reportCustomer = async (req, res) => {
  const sellerId = req.user.id;
  const { customer_id, reason, description } = req.body;

  if (!customer_id || !reason) {
    return res.status(400).json({ error: 'Customer ID and reason are required.' });
  }

  try {
    await db.query(
      `INSERT INTO customer_reports (seller_id, customer_id, reason, description) 
       VALUES ($1, $2, $3, $4)`,
      [sellerId, customer_id, reason, description || '']
    );

    return res.status(201).json({ message: 'Customer reported successfully.' });
  } catch (err) {
    console.error('Report customer error:', err);
    return res.status(500).json({ error: 'Server error reporting customer.' });
  }
};

// Mark order as "No Pickup" / "Abandoned"
const markNoPickup = async (req, res) => {
  const sellerId = req.user.id;
  const { id } = req.params; // Order ID

  try {
    // 1. Verify the order belongs to this seller and is ready for pickup
    const orderResult = await db.query(
      `SELECT o.*, s.owner_id as seller_user_id, s.shop_name 
       FROM orders o 
       JOIN shops s ON o.shop_id = s.id 
       WHERE o.id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const order = orderResult.rows[0];

    if (Number(order.seller_user_id) !== Number(sellerId)) {
      return res.status(403).json({ error: 'Unauthorized to modify this order.' });
    }

    if (order.order_status !== 'Ready For Pickup' && order.order_status !== 'Packing Completed') {
      return res.status(400).json({ error: 'Only orders marked Ready For Pickup or Packing Completed can be marked as No Pickup.' });
    }

    // 2. Mark order as cancelled
    const updateResult = await db.query(
      `UPDATE orders SET order_status = 'Cancelled', notes = 'Cancelled due to No Pickup', updated_at = CURRENT_TIMESTAMP, cancelled_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );
    const updatedOrder = updateResult.rows[0];

    // 3. Update customer_trust metrics (increment abandoned_orders)
    const trustResult = await db.query(
      `INSERT INTO customer_trust (customer_id, abandoned_orders) 
       VALUES ($1, 1) 
       ON CONFLICT (customer_id) 
       DO UPDATE SET abandoned_orders = customer_trust.abandoned_orders + 1
       RETURNING *`,
      [order.customer_id]
    );

    const trustData = trustResult.rows[0];
    const abandonedCount = trustData.abandoned_orders;

    // Apply penalties based on Phase 7A No Pickup tracking rules
    let penaltyMessage = '';
    
    if (abandonedCount <= 1) {
      // Chance 1: No severe penalty, just track it
      penaltyMessage = 'Please ensure you pick up your future orders.';
    } else if (abandonedCount === 2) {
      // 2nd time: Warning
      penaltyMessage = 'Warning: You have failed to pick up multiple orders. Further abandoned orders will result in account restrictions.';
      await db.query(`UPDATE customer_trust SET no_pickup_warnings = no_pickup_warnings + 1 WHERE customer_id = $1`, [order.customer_id]);
    } else if (abandonedCount >= 3) {
      // Keep doing it (3rd time or more): Restriction
      penaltyMessage = 'Restriction applied: Account temporarily suspended for 7 days due to excessive no-pickups.';
      await db.query(`UPDATE customer_trust SET suspension_end_date = CURRENT_TIMESTAMP + INTERVAL '7 days', active_order_limit = 2, abandoned_orders = 0 WHERE customer_id = $1`, [order.customer_id]);
    }

    // Notify customer
    await notificationEngine.dispatchNotification(
      order.customer_id,
      'Order Abandoned',
      `Your order at ${order.shop_name} was marked as No Pickup and cancelled. ${penaltyMessage}`,
      'order_cancelled',
      {
        orderId: order.id,
        customOrderId: order.custom_order_id,
        shopName: order.shop_name
      }
    );

    return res.status(200).json({ message: 'Order marked as No Pickup', order: updatedOrder });
  } catch (err) {
    console.error('Mark no pickup error:', err);
    return res.status(500).json({ error: 'Server error marking order as no pickup.' });
  }
};

module.exports = {
  blockCustomer,
  reportCustomer,
  markNoPickup
};
