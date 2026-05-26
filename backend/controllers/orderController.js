const db = require('../config/db');
const socketService = require('../services/socketService');
const { uploadImage } = require('../services/storageService');

// Helper: Update shop's active orders count in the DB
const updateShopQueueCount = async (shopId) => {
  try {
    // Count orders in active states
    const activeStates = [
      'Waiting For Seller',
      'Accepted',
      'Bill Uploaded',
      'Waiting For Customer Confirmation',
      'Confirmed',
      'Packing Started',
      'Packing Completed'
    ];
    
    const countResult = await db.query(
      `SELECT COUNT(*) FROM orders 
       WHERE shop_id = $1 AND order_status ANY($2::varchar[])`,
      [shopId, activeStates]
    );
    
    // Fallback simple query for compatibility
    const countResultCompatible = await db.query(
      `SELECT COUNT(*) FROM orders 
       WHERE shop_id = $1 AND order_status IN (
         'Waiting For Seller', 'Accepted', 'Bill Uploaded', 
         'Waiting For Customer Confirmation', 'Confirmed', 'Packing Started', 'Packing Completed'
       )`,
      [shopId]
    );

    const count = parseInt(countResultCompatible.rows[0].count);

    // Update shop details
    const shopResult = await db.query('SELECT max_active_orders, waiting_time, availability_status FROM shops WHERE id = $1', [shopId]);
    if (shopResult.rows.length > 0) {
      const shop = shopResult.rows[0];
      let newStatus = shop.availability_status;

      // Check if max orders reached
      if (count >= shop.max_active_orders && shop.availability_status === 'Available') {
        newStatus = 'Busy';
      } else if (count < shop.max_active_orders && shop.availability_status === 'Busy') {
        newStatus = 'Available';
      }

      // Update in DB
      await db.query(
        'UPDATE shops SET active_orders = $1, availability_status = $2 WHERE id = $3',
        [count, newStatus, shopId]
      );

      // Broadcast changes
      socketService.emitShopStatus(shopId, newStatus, count, shop.waiting_time);
    }
  } catch (err) {
    console.error('Error updating shop queue count:', err);
  }
};

// 1. Customer Places Order (Uploads Chitti or Types Digitally)
const createOrder = async (req, res) => {
  const customerId = req.user.id;
  const { shop_id, notes, preferred_pickup_time, order_type, digital_item_list } = req.body;
  const file = req.file;

  const isDigital = order_type === 'digital';

  if (!shop_id) {
    return res.status(400).json({ error: 'Shop ID is required.' });
  }

  if (!isDigital && !file) {
    return res.status(400).json({ error: 'Handwritten chitti image is required.' });
  }

  if (isDigital && (!digital_item_list || digital_item_list.length === 0)) {
    return res.status(400).json({ error: 'Digital grocery list is empty or invalid.' });
  }

  try {
    // Check shop exists and is accepting orders
    const shopResult = await db.query('SELECT * FROM shops WHERE id = $1', [shop_id]);
    if (shopResult.rows.length === 0) {
      return res.status(404).json({ error: 'Selected shop does not exist.' });
    }
    
    const shop = shopResult.rows[0];
    if (shop.availability_status === 'Offline') {
      return res.status(400).json({ error: 'This shop is currently offline and not accepting online orders.' });
    }

    let chittiUrl = 'digital';
    let itemsList = null;

    if (isDigital) {
      itemsList = digital_item_list;
      if (typeof itemsList === 'string') {
        try {
          itemsList = JSON.parse(itemsList);
        } catch (e) {
          return res.status(400).json({ error: 'Invalid format for digital grocery list.' });
        }
      }
    } else {
      // Upload image
      chittiUrl = await uploadImage(file);
    }

    // Generate custom_order_id: TitleCase3Letters + DDMMYY + 2DigitSeqNum (e.g. Arj24052601)
    const getCustomerPrefix = (name) => {
      if (!name) return 'Krn';
      const cleanName = name.trim().replace(/[^a-zA-Z]/g, '');
      if (cleanName.length === 0) return 'Krn';
      const prefix = cleanName.substring(0, 3);
      const titleCased = prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();
      return titleCased.padEnd(3, 'x');
    };
    const prefix = getCustomerPrefix(req.user.name);

    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = String(today.getFullYear()).slice(-2);
    const dateStr = `${day}${month}${year}`; // DDMMYY

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const countResult = await db.query(
      `SELECT COUNT(*) FROM orders WHERE created_at >= $1`,
      [todayStart]
    );
    let orderSeq = 1;
    if (countResult.rows && countResult.rows.length > 0) {
      orderSeq = parseInt(countResult.rows[0].count) + 1;
    }
    const orderSeqStr = String(orderSeq).padStart(2, '0');
    const customOrderId = `${prefix}${dateStr}${orderSeqStr}`;

    // Insert order (Waiting For Seller) with custom_order_id
    const result = await db.query(
      `INSERT INTO orders (customer_id, shop_id, original_chitti, notes, preferred_pickup_time, order_status, custom_order_id, order_type, digital_item_list) 
       VALUES ($1, $2, $3, $4, $5, 'Waiting For Seller', $6, $7, $8) 
       RETURNING *`,
      [
        customerId, 
        shop_id, 
        chittiUrl, 
        notes || '', 
        preferred_pickup_time || '', 
        customOrderId, 
        order_type || 'handwritten', 
        isDigital ? JSON.stringify(itemsList) : null
      ]
    );

    const order = result.rows[0];

    // Trigger shop queue update
    await updateShopQueueCount(shop_id);

    // Realtime alert using Socket.IO (for dashboard list update checks)
    socketService.alertNewOrder(shop_id, order);

    // Multi-channel notification engine dispatch
    const notificationEngine = require('../services/notificationEngine');
    await notificationEngine.dispatchNotification(
      shop.owner_id,
      'New Order Received',
      `New order received from customer ${req.user.name}! Order ID: ${order.custom_order_id || 'KRN' + order.id}`,
      'new_order',
      {
        orderId: order.id,
        customOrderId: order.custom_order_id,
        customerName: req.user.name,
        shopName: shop.shop_name
      }
    );

    return res.status(201).json(order);
  } catch (err) {
    console.error('Create order error:', err);
    return res.status(500).json({ error: 'Server error placing order.' });
  }
};

// 2. Get Orders (List for Customer or Seller)
const getOrders = async (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;

  try {
    let result;
    if (role === 'customer') {
      result = await db.query(
        `SELECT o.*, s.shop_name, s.upi_id, s.qr_code_image, u.name as customer_name
         FROM orders o 
         JOIN shops s ON o.shop_id = s.id 
         JOIN users u ON o.customer_id = u.id
         WHERE o.customer_id = $1 
         ORDER BY o.created_at DESC`,
        [userId]
      );
    } else if (role === 'seller') {
      // Find shop
      const shopResult = await db.query('SELECT id FROM shops WHERE owner_id = $1', [userId]);
      if (shopResult.rows.length === 0) {
        return res.status(200).json([]); // No shop, return empty
      }
      const shopId = shopResult.rows[0].id;

      result = await db.query(
        `SELECT o.*, u.name as customer_name, u.phone as customer_phone 
         FROM orders o 
         JOIN users u ON o.customer_id = u.id 
         WHERE o.shop_id = $1 
         ORDER BY o.created_at DESC`,
        [shopId]
      );
    } else {
      return res.status(403).json({ error: 'Unauthorized role.' });
    }

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('Get orders error:', err);
    return res.status(500).json({ error: 'Server error retrieving orders.' });
  }
};

// 3. Update Order Status (Seller transitions / Cancellations / Digital approvals)
const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status, reason, item_change_history } = req.body; // reason for cancellation / updates
  const userId = req.user.id;
  const role = req.user.role;

  const validStatuses = [
    'Waiting For Seller', 'Accepted', 'Bill Uploaded', 
    'Waiting For Customer Confirmation', 'Confirmed', 'Packing Started', 
    'Packing Completed', 'Ready For Pickup', 'Delivered', 'Cancelled'
  ];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid or missing order status.' });
  }

  try {
    // Fetch order
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
    console.log(`DEBUG updateOrderStatus: order.id=${order.id}, order.shop_id=${order.shop_id}, order.seller_user_id=${order.seller_user_id} (type: ${typeof order.seller_user_id}), userId=${userId} (type: ${typeof userId})`);

    // Auth validation
    if (role === 'seller' && Number(order.seller_user_id) !== Number(userId)) {
      return res.status(403).json({ error: 'Unauthorized to modify this shop\'s orders.' });
    }
    
    if (role === 'customer') {
      if (Number(order.customer_id) !== Number(userId)) {
        return res.status(403).json({ error: 'Unauthorized to modify this order.' });
      }
      
      const isAwaitingVerification = ['Bill Uploaded', 'Waiting For Customer Confirmation'].includes(order.order_status);
      
      // Awaiting customer verification: customer can approve (Packing Started), reject (Cancelled), or request changes (Waiting For Seller)
      if (isAwaitingVerification) {
        const allowedDigitalActions = ['Packing Started', 'Cancelled', 'Waiting For Seller'];
        if (!allowedDigitalActions.includes(status)) {
          return res.status(400).json({ error: `Invalid action '${status}' during verification.` });
        }
      } else {
        // Standard rules: Customers can only cancel before packing starts
        if (status !== 'Cancelled') {
          return res.status(403).json({ error: 'Customers can only cancel orders.' });
        }
        const uncancelable = ['Packing Started', 'Packing Completed', 'Ready For Pickup', 'Confirmed', 'Delivered', 'Cancelled'];
        if (uncancelable.includes(order.order_status)) {
          return res.status(400).json({ error: 'Cannot cancel order once packing has started.' });
        }
      }
    }

    let timestampColumn = '';
    if (status === 'Accepted') timestampColumn = ', accepted_at = CURRENT_TIMESTAMP';
    else if (status === 'Packing Started') timestampColumn = ', packing_started_at = CURRENT_TIMESTAMP';
    else if (status === 'Ready For Pickup') timestampColumn = ', ready_for_pickup_at = CURRENT_TIMESTAMP';
    else if (status === 'Delivered') timestampColumn = ', delivered_at = CURRENT_TIMESTAMP, payment_status = \'Paid\'';
    else if (status === 'Cancelled') timestampColumn = ', cancelled_at = CURRENT_TIMESTAMP';

    // Perform update
    let updateResult;
    if (status === 'Waiting For Seller' && role === 'customer' && item_change_history) {
      const historyNotes = reason || 'Customer requested modifications';
      updateResult = await db.query(
        `UPDATE orders 
         SET order_status = $1, 
             notes = $2, 
             item_change_history = $3, 
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $4 RETURNING *`,
        [status, historyNotes, typeof item_change_history === 'string' ? item_change_history : JSON.stringify(item_change_history), id]
      );
    } else {
      updateResult = await db.query(
        `UPDATE orders SET order_status = $1, updated_at = CURRENT_TIMESTAMP${timestampColumn} WHERE id = $2 RETURNING *`,
        [status, id]
      );
    }

    const updatedOrder = updateResult.rows[0];

    // Update queue counts
    await updateShopQueueCount(order.shop_id);

    // Performance and Trust tracking on completions
    if (status === 'Delivered') {
      // 1. Customer Trust increment successful pickups
      await db.query(
        `INSERT INTO customer_trust (customer_id, successful_pickups) 
         VALUES ($1, 1) 
         ON CONFLICT (customer_id) 
         DO UPDATE SET successful_pickups = customer_trust.successful_pickups + 1`,
        [order.customer_id]
      );

      // 2. Seller performance update
      const responseTimeSec = Math.round((new Date() - new Date(order.created_at)) / 1000 / 60);
      await db.query(
        `INSERT INTO seller_performance (shop_id, response_time_avg, total_completed_orders) 
         VALUES ($1, $2, 1) 
         ON CONFLICT (shop_id) 
         DO UPDATE SET 
           response_time_avg = ROUND((seller_performance.response_time_avg * seller_performance.total_completed_orders + $2) / (seller_performance.total_completed_orders + 1)),
           total_completed_orders = seller_performance.total_completed_orders + 1`,
        [order.shop_id, responseTimeSec]
      );
    } else if (status === 'Cancelled') {
      // 1. Customer cancellations update
      await db.query(
        `INSERT INTO customer_trust (customer_id, cancellations) 
         VALUES ($1, 1) 
         ON CONFLICT (customer_id) 
         DO UPDATE SET cancellations = customer_trust.cancellations + 1`,
        [order.customer_id]
      );

      // 2. Seller cancellation performance
      await db.query(
        `INSERT INTO seller_performance (shop_id, total_cancelled_orders) 
         VALUES ($1, 1) 
         ON CONFLICT (shop_id) 
         DO UPDATE SET total_cancelled_orders = seller_performance.total_cancelled_orders + 1`,
        [order.shop_id]
      );
    }

    // Trigger Notification setup
    let notifyUserId, notifyMessage, notifType, notifTitle;

    if (role === 'seller') {
      notifyUserId = order.customer_id;
      notifType = status === 'Ready For Pickup' ? 'pickup_ready' : 'order_status';
      notifTitle = `Order Update: ${status}`;
      if (status === 'Accepted') {
        notifyMessage = `Your order at ${order.shop_name} has been Accepted! Rewriting bill now...`;
      } else if (status === 'Packing Started') {
        notifyMessage = `${order.shop_name} has started packing your order.`;
      } else if (status === 'Packing Completed') {
        notifyMessage = `Packing complete for your order at ${order.shop_name}.`;
      } else if (status === 'Ready For Pickup') {
        notifyMessage = `🎉 Your order at ${order.shop_name} is Ready For Pickup!`;
        notifTitle = 'Ready For Pickup';
      } else if (status === 'Cancelled') {
        notifyMessage = `Your order at ${order.shop_name} was cancelled by the seller. Reason: ${reason || 'None specified'}`;
        notifTitle = 'Order Cancelled';
      } else {
        notifyMessage = `Your order status at ${order.shop_name} is now: ${status}`;
      }
    } else {
      // Customer actions
      notifyUserId = order.seller_user_id;
      if (status === 'Packing Started') {
        notifType = 'order_approved';
        notifTitle = 'Order Approved';
        notifyMessage = `Customer approved the digital invoice for Order #${order.custom_order_id || order.id}! You can start packing.`;
      } else if (status === 'Waiting For Seller') {
        notifType = 'revision_requested';
        notifTitle = 'Revision Requested';
        notifyMessage = `Customer requested item modifications for Order #${order.custom_order_id || order.id}. Please review items.`;
      } else {
        notifType = 'order_cancelled';
        notifTitle = 'Order Cancelled';
        notifyMessage = `Order #${order.custom_order_id || order.id} was cancelled by the customer.`;
      }
    }

    if (notifyUserId) {
      const notificationEngine = require('../services/notificationEngine');
      await notificationEngine.dispatchNotification(
        notifyUserId,
        notifTitle,
        notifyMessage,
        notifType,
        {
          orderId: order.id,
          customOrderId: order.custom_order_id,
          shopName: order.shop_name,
          customerName: order.customer_name || 'Customer'
        }
      );
    }

    // Emit live status update to both channels
    socketService.emitOrderStatus(updatedOrder, order.customer_id, order.shop_id);

    return res.status(200).json(updatedOrder);
  } catch (err) {
    console.error('Update status error:', err);
    return res.status(500).json({ error: 'Server error updating order status.' });
  }
};

// 4. Seller Uploads Bill Details (Modified Bill + Amount or Digital Invoice)
const uploadBill = async (req, res) => {
  const { id } = req.params;
  const { amount, notes, modified_item_list } = req.body;
  const file = req.file; // Multer upload
  const sellerId = req.user.id;

  try {
    // Fetch order
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
    const isDigital = order.order_type === 'digital';

    if (!isDigital && (!amount || (!file && !order.modified_bill))) {
      return res.status(400).json({ error: 'Modified bill image and total amount are required.' });
    }

    if (isDigital && (!amount || !modified_item_list)) {
      return res.status(400).json({ error: 'Digital bill items and grand total are required.' });
    }

    console.log(`DEBUG uploadBill: order.id=${order.id}, order.shop_id=${order.shop_id}, order.seller_user_id=${order.seller_user_id} (type: ${typeof order.seller_user_id}), sellerId=${sellerId} (type: ${typeof sellerId})`);

    // Auth verification
    if (Number(order.seller_user_id) !== Number(sellerId)) {
      return res.status(403).json({ error: 'Unauthorized to process this shop\'s orders.' });
    }

    let result;
    if (isDigital) {
      let itemsList = modified_item_list;
      if (typeof itemsList === 'string') {
        try {
          itemsList = JSON.parse(itemsList);
        } catch (e) {
          return res.status(400).json({ error: 'Invalid format for modified grocery list.' });
        }
      }

      // Update digital order -> Bill Uploaded
      result = await db.query(
        `UPDATE orders 
         SET modified_item_list = $1, amount = $2, notes = $3, 
             payment_method = NULL, payment_status = 'Pending', payment_proof_image = NULL,
             order_status = 'Bill Uploaded', updated_at = CURRENT_TIMESTAMP 
         WHERE id = $4 
         RETURNING *`,
        [JSON.stringify(itemsList), parseFloat(amount), notes || '', id]
      );
    } else {
      // Upload modified bill chitti image if a new file is uploaded, otherwise keep the existing one
      let billUrl = order.modified_bill;
      if (file) {
        billUrl = await uploadImage(file);
      }

      // Update handwritten order -> Bill Uploaded
      result = await db.query(
        `UPDATE orders 
         SET modified_bill = $1, amount = $2, notes = $3, 
             payment_method = NULL, payment_status = 'Pending', payment_proof_image = NULL,
             order_status = 'Bill Uploaded', updated_at = CURRENT_TIMESTAMP 
         WHERE id = $4 
         RETURNING *`,
        [billUrl, parseFloat(amount), notes || '', id]
      );
    }

    const updatedOrder = result.rows[0];

    // Send notifications to Customer
    const message = isDigital 
      ? `Invoice updated for your digital order at ${order.shop_name}! Packing has started. You will pay when it is ready.`
      : `Bill uploaded for your order at ${order.shop_name}! Packing has started. You will pay when it is ready.`;

    const notificationEngine = require('../services/notificationEngine');
    await notificationEngine.dispatchNotification(
      order.customer_id,
      'Packing Started',
      message,
      'packing_started',
      {
        orderId: order.id,
        customOrderId: order.custom_order_id,
        amount: parseFloat(amount),
        shopName: order.shop_name
      }
    );

    socketService.emitOrderStatus(updatedOrder, order.customer_id, order.shop_id);

    return res.status(200).json(updatedOrder);
  } catch (err) {
    console.error('Upload bill error:', err);
    return res.status(500).json({ error: 'Server error processing bill upload.' });
  }
};

// 5. Customer Confirms Order & Selects Payment (Optionally uploads UPI receipt screenshot)
const confirmOrder = async (req, res) => {
  const { id } = req.params;
  const { payment_method } = req.body;
  const file = req.file; // optional payment proof
  const customerId = req.user.id;

  const validMethods = ['Pay During Pickup', 'Manual UPI Payment'];

  if (!payment_method || !validMethods.includes(payment_method)) {
    return res.status(400).json({ error: 'Valid payment method selection is required.' });
  }

  try {
    // Fetch order
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

    if (Number(order.customer_id) !== Number(customerId)) {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    let proofUrl = null;
    let paymentStatus = 'Pending';

    if (payment_method === 'Manual UPI Payment') {
      if (file) {
        proofUrl = await uploadImage(file);
        paymentStatus = 'Uploaded Proof';
      } else {
        paymentStatus = 'Paid (No Screenshot)';
      }
    }

    // Transition status to Confirmed (Seller must perform final delivered confirmation)
    const result = await db.query(
      `UPDATE orders 
       SET order_status = 'Confirmed', payment_method = $1, payment_status = $2, 
           payment_proof_image = $3, confirmed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $4 
       RETURNING *`,
      [payment_method, paymentStatus, proofUrl, id]
    );

    const updatedOrder = result.rows[0];

    // Notification to Seller
    const message = `Customer confirmed Order #${order.custom_order_id || order.id} using ${payment_method}!`;
    const notificationEngine = require('../services/notificationEngine');
    await notificationEngine.dispatchNotification(
      order.seller_user_id,
      'Order Confirmed',
      message,
      'order_confirmed',
      {
        orderId: order.id,
        customOrderId: order.custom_order_id,
        shopName: order.shop_name,
        paymentMethod: payment_method
      }
    );

    socketService.emitOrderStatus(updatedOrder, order.customer_id, order.shop_id);

    return res.status(200).json(updatedOrder);
  } catch (err) {
    console.error('Confirm order error:', err);
    return res.status(500).json({ error: 'Server error confirming order.' });
  }
};

module.exports = {
  createOrder,
  getOrders,
  updateOrderStatus,
  uploadBill,
  confirmOrder
};
