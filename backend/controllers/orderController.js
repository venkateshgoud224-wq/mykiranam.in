const db = require('../config/db');
const socketService = require('../services/socketService');
const { uploadImage } = require('../services/storageService');
const priceEngine = require('../services/priceEngine');
const sellerPerformanceService = require('../services/sellerPerformanceService');

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
    // --- Phase 7A: Seller Block Check ---
    const blockResult = await db.query(
      `SELECT * FROM seller_customer_blocks 
       WHERE customer_id = $1 AND seller_id = (SELECT owner_id FROM shops WHERE id = $2)`,
      [customerId, shop_id]
    );
    if (blockResult.rows.length > 0) {
      return res.status(403).json({ error: 'You are not allowed to place orders with this shop.' });
    }

    // --- Phase 7A: Active Order Limitation & Suspension Check ---
    const trustResult = await db.query(`SELECT * FROM customer_trust WHERE customer_id = $1`, [customerId]);
    let activeLimit = 2; // default
    if (trustResult.rows.length > 0) {
      const trust = trustResult.rows[0];
      
      if (trust.suspension_end_date && new Date(trust.suspension_end_date) > new Date()) {
        return res.status(403).json({ error: `Your account is suspended until ${new Date(trust.suspension_end_date).toLocaleDateString()} due to policy violations.` });
      }
      activeLimit = trust.active_order_limit || 2;
    }

    const activeStates = [
      'Waiting For Seller', 'Accepted', 'Bill Uploaded', 
      'Waiting For Customer Confirmation', 'Confirmed', 'Packing Started', 
      'Packing Completed', 'Ready For Pickup'
    ];
    
    const activeOrdersResult = await db.query(
      `SELECT COUNT(*) FROM orders WHERE customer_id = $1 AND order_status = ANY($2::varchar[])`,
      [customerId, activeStates]
    );
    
    const activeCount = parseInt(activeOrdersResult.rows[0].count);
    
    if (activeCount >= activeLimit) {
      return res.status(400).json({ error: `You already have ${activeLimit} active orders. Complete or cancel an existing order before creating a new one.` });
    }
    // ------------------------------------------------

    // --- SUSPICIOUS ACTIVITY DETECTION (Phase 7B) ---
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60000);
    const recentOrdersResult = await db.query(
      `SELECT shop_id FROM orders WHERE customer_id = $1 AND created_at >= $2`,
      [customerId, fifteenMinsAgo]
    );

    const uniqueShops = new Set(recentOrdersResult.rows.map(row => row.shop_id));
    if (uniqueShops.size >= 2 && !uniqueShops.has(parseInt(shop_id))) {
      // Flag suspicious activity: same customer, multiple shops within 15 minutes
      await db.query(
        `INSERT INTO suspicious_activities (customer_id, reason, risk_score, status) 
         VALUES ($1, $2, $3, 'Pending Review')`,
        [customerId, `Placed orders at ${uniqueShops.size + 1} different shops within 15 minutes.`, 75]
      );
    }
    // ------------------------------------------------

    // Check shop exists and is accepting orders
    const shopResult = await db.query('SELECT * FROM shops WHERE id = $1', [shop_id]);
    if (shopResult.rows.length === 0) {
      return res.status(404).json({ error: 'Selected shop does not exist.' });
    }
    
    const shop = shopResult.rows[0];
    if (shop.warning_level === 'Warning 5') {
      return res.status(403).json({ error: 'This shop is temporarily suspended and cannot receive new orders.' });
    }
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
      `SELECT COUNT(*) FROM orders WHERE shop_id = $1 AND created_at >= $2`,
      [shop_id, todayStart]
    );
    let orderSeq = 1;
    if (countResult.rows && countResult.rows.length > 0) {
      orderSeq = parseInt(countResult.rows[0].count) + 1;
    }
    const orderSeqStr = String(orderSeq).padStart(2, '0');
    const customOrderId = `${prefix}${dateStr}${orderSeqStr}`;

    // TEMPORARY: PhonePe testing bypass
    let initialStatus = 'Waiting For Seller';
    let initialAmount = null;
    let initialModifiedList = null;
    
    if (isDigital && req.body.estimated_amount) {
      initialStatus = 'Waiting For Customer Confirmation';
      initialAmount = parseFloat(req.body.estimated_amount);
      initialModifiedList = JSON.stringify(itemsList);
    }

    // Insert order
    const result = await db.query(
      `INSERT INTO orders (customer_id, shop_id, original_chitti, notes, preferred_pickup_time, order_status, custom_order_id, order_type, digital_item_list, gateway_fee, amount, modified_item_list) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
       RETURNING *`,
      [
        customerId, 
        shop_id, 
        chittiUrl, 
        notes || '', 
        preferred_pickup_time || '', 
        initialStatus, 
        customOrderId, 
        order_type || 'handwritten', 
        isDigital ? JSON.stringify(itemsList) : null,
        0,
        initialAmount,
        initialModifiedList
      ]
    );

    const insertedOrder = result.rows[0];

    // Fetch complete order details including joined shops and users fields, matching getOrders
    const orderDetailsResult = await db.query(
      `SELECT o.*, s.shop_name, s.address as shop_address, s.latitude as shop_latitude, s.longitude as shop_longitude, s.working_hours as shop_working_hours, s.upi_id, s.qr_code_image, su.phone as seller_phone, u.name as customer_name, cp.status as commitment_status
       FROM orders o 
       JOIN shops s ON o.shop_id = s.id 
       JOIN users u ON o.customer_id = u.id
       JOIN users su ON s.owner_id = su.id
       LEFT JOIN commitment_payments cp ON o.id = cp.order_id
       WHERE o.id = $1`,
      [insertedOrder.id]
    );

    const order = orderDetailsResult.rows[0] || insertedOrder;

    // Trigger shop queue update
    await updateShopQueueCount(shop_id);

    // --- Phase 7A: Increment total_orders ---
    await db.query(
      `INSERT INTO customer_trust (customer_id, total_orders) 
       VALUES ($1, 1) 
       ON CONFLICT (customer_id) 
       DO UPDATE SET total_orders = customer_trust.total_orders + 1`,
      [customerId]
    );
    // ----------------------------------------

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

    // Send transactional emails to both customer and seller
    await notificationEngine.dispatchOrderTransactionEmails(order.id);

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
        `SELECT o.*, s.shop_name, s.address as shop_address, s.latitude as shop_latitude, s.longitude as shop_longitude, s.working_hours as shop_working_hours, s.upi_id, s.qr_code_image, su.phone as seller_phone, u.name as customer_name, cp.status as commitment_status,
                COALESCE(ct.cancellations, 0) as cancellations
         FROM orders o 
         JOIN shops s ON o.shop_id = s.id 
         JOIN users u ON o.customer_id = u.id
         JOIN users su ON s.owner_id = su.id
         LEFT JOIN commitment_payments cp ON o.id = cp.order_id
         LEFT JOIN customer_trust ct ON o.customer_id = ct.customer_id
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
        `SELECT o.*, u.name as customer_name, u.phone as customer_phone,
                COALESCE(ct.trust_score, 100) as customer_trust_score,
                COALESCE(ct.customer_level, 'Standard Customer') as customer_level,
                COALESCE(ct.successful_pickups, 0) as successful_pickups,
                COALESCE(ct.cancellations, 0) as cancellations,
                COALESCE(ct.total_orders, 0) as total_customer_orders,
                COALESCE(ct.abandoned_orders, 0) as abandoned_orders,
                CASE 
                   WHEN COALESCE(ct.total_orders, 0) > 0 
                   THEN ROUND((COALESCE(ct.successful_pickups, 0) * 100.0) / COALESCE(ct.total_orders, 1))
                END as reliability_score,
                cp.status as commitment_status
         FROM orders o 
         JOIN users u ON o.customer_id = u.id 
         LEFT JOIN customer_trust ct ON u.id = ct.customer_id
         LEFT JOIN commitment_payments cp ON o.id = cp.order_id
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
      
      // Awaiting customer verification: customer can reject (Cancelled), or request changes (Waiting For Seller)
      if (isAwaitingVerification) {
        const allowedDigitalActions = ['Cancelled', 'Waiting For Seller'];
        if (!allowedDigitalActions.includes(status)) {
          return res.status(400).json({ error: `Invalid action '${status}' during verification.` });
        }
      } else {
        // Standard rules: Customers can only cancel before packing starts
        if (status !== 'Cancelled') {
          return res.status(403).json({ error: 'Customers can only cancel orders.' });
        }
        const uncancelable = ['Delivered', 'Cancelled'];
        if (uncancelable.includes(order.order_status)) {
          return res.status(400).json({ error: 'Cannot cancel an already completed or cancelled order.' });
        }
      }
    }

    // Save the original status to detect transitions (e.g. revision request)
    const originalStatus = order.order_status;

    let timestampColumn = '';
    if (status === 'Accepted') timestampColumn = ', accepted_at = CURRENT_TIMESTAMP';
    else if (status === 'Packing Started') timestampColumn = ', packing_started_at = CURRENT_TIMESTAMP';
    else if (status === 'Ready For Pickup') timestampColumn = ', ready_for_pickup_at = CURRENT_TIMESTAMP';
    else if (status === 'Delivered') timestampColumn = ', delivered_at = CURRENT_TIMESTAMP, payment_status = \'Paid\'';
    else if (status === 'Cancelled') timestampColumn = ', cancelled_at = CURRENT_TIMESTAMP';

    let additionalQueryVars = [];
    if (status === 'Ready For Pickup') {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const deadline = new Date();
      deadline.setHours(deadline.getHours() + 6); // default 6 hours
      timestampColumn += ', pickup_otp = $3, otp_generated_at = CURRENT_TIMESTAMP, pickup_deadline = $4';
      additionalQueryVars.push(otp, deadline);
    }

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
      let queryText = `UPDATE orders SET order_status = $1, updated_at = CURRENT_TIMESTAMP${timestampColumn} WHERE id = $2 RETURNING *`;
      updateResult = await db.query(queryText, [status, id, ...additionalQueryVars]);
    }

    const updatedOrder = updateResult.rows[0];

    // Update queue counts
    await updateShopQueueCount(order.shop_id);

    // Performance and Trust tracking on completions
    if (status === 'Delivered') {
      // 1. Customer Trust increment successful pickups
      await db.query(
        `INSERT INTO customer_trust (customer_id, successful_pickups, trust_score) 
         VALUES ($1, 1, 101) 
         ON CONFLICT (customer_id) 
         DO UPDATE SET 
           successful_pickups = customer_trust.successful_pickups + 1,
           trust_score = LEAST(100, COALESCE(customer_trust.trust_score, 100) + 1)`,
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

      // Phase 8A: Extract historical prices
      const priceEngine = require('../services/priceEngine');
      await priceEngine.extractOrderPrices(updatedOrder.id);

      // Phase 8B / Phase 6: Savings Engine
      try {
        const estimatedDeliverySavings = 35;
        const myKiranamPrice = parseFloat(order.amount || 0);
        const baseFee = myKiranamPrice * 0.02;
        const gst = baseFee * 0.18;
        const estimatedPlatformSavings = Math.round(baseFee + gst) + 10;

        let marketPriceTotal = 0;
        if (order.order_type === 'digital' && order.modified_item_list) {
          let items = [];
          try {
            items = typeof order.modified_item_list === 'string' ? JSON.parse(order.modified_item_list) : order.modified_item_list;
          } catch(e) {}
          
          for (const item of items) {
             if (!item.name) continue;
             const q = item.name.toLowerCase().trim();
             
             let mPrice = 0;
             if (db.getIsMock && db.getIsMock()) {
                 mPrice = parseFloat(item.price || 0) * 1.15;
             } else {
                 const match = await db.query('SELECT market_price FROM products_dictionary WHERE product_name ILIKE $1 LIMIT 1', [`%${q}%`]);
                 if (match.rows.length > 0) {
                     mPrice = parseFloat(match.rows[0].market_price) || 0;
                 } else {
                     mPrice = parseFloat(item.price || 0) * 1.15;
                 }
             }
             marketPriceTotal += (mPrice * parseFloat(item.quantity || 1));
          }
        } else {
          marketPriceTotal = myKiranamPrice * 1.15; // Assume 15% higher in online apps
        }
        
        let productSavings = marketPriceTotal - myKiranamPrice;
        if (productSavings < 0) productSavings = 0;

        const totalSavings = estimatedDeliverySavings + estimatedPlatformSavings + Math.round(productSavings);
        const estimatedTimeSaved = 30; // 10m queue + 15m shop + 5m bill

        if (order.customer_id) {
          // Update Customer Savings
          await db.query(
            `INSERT INTO customer_savings (
               customer_id, total_orders, total_savings, total_time_saved, last_order_date, favorite_shop_id
             ) 
             VALUES ($1, 1, $2, $3, CURRENT_TIMESTAMP, $4)
             ON CONFLICT (customer_id)
             DO UPDATE SET 
               total_orders = customer_savings.total_orders + 1,
               total_savings = customer_savings.total_savings + $2,
               total_time_saved = customer_savings.total_time_saved + $3,
               last_order_date = CURRENT_TIMESTAMP,
               favorite_shop_id = $4`,
            [order.customer_id, totalSavings, estimatedTimeSaved, order.shop_id]
          );
        }

        // Update Community Savings
        await db.query(
          `UPDATE community_savings 
           SET total_orders = total_orders + 1,
               total_savings = total_savings + $1,
               total_time_saved = total_time_saved + $2,
               last_updated = CURRENT_TIMESTAMP
           WHERE id = (SELECT MIN(id) FROM community_savings)`,
          [totalSavings, estimatedTimeSaved]
        );
        
        // Recalculate seller performance
        await sellerPerformanceService.recalculateSellerPerformance(order.shop_id);
      } catch (err) {
        console.error('Error in Phase 8B Savings & Achievements logic:', err);
      }
    } else if (status === 'Cancelled') {
      if (role === 'customer') {
        // 1. Customer cancellations update (Only penalize customer if they cancelled after bill uploaded)
        const isBillUpdated = originalStatus !== 'Waiting For Seller';
        
        if (isBillUpdated) {
          const trustRes = await db.query(
            `INSERT INTO customer_trust (customer_id, cancellations, trust_score) 
             VALUES ($1, 1, 95) 
             ON CONFLICT (customer_id) 
             DO UPDATE SET 
               cancellations = customer_trust.cancellations + 1,
               trust_score = GREATEST(0, COALESCE(customer_trust.trust_score, 100) - 5)
             RETURNING cancellations`,
            [order.customer_id]
          );

          // Phase 7A: Customer Cancellation Penalty Logic (Strict 2 chances, warn 3rd, restrict 4th)
          try {
            const cancellations = trustRes.rows[0].cancellations;
            const notificationEngine = require('../services/notificationEngine');
            
            if (cancellations === 3) {
              // 3rd time: Warning
              await notificationEngine.dispatchNotification(order.customer_id, 'Warning: Frequent Cancellations', 'Warning: You have cancelled multiple orders recently. Further cancellations will result in account restrictions.', 'warning', { orderId: order.id });
            } else if (cancellations >= 4) {
              // 4th time+: Restriction
              await db.query(`UPDATE customer_trust SET suspension_end_date = CURRENT_TIMESTAMP + INTERVAL '7 days', active_order_limit = 2 WHERE customer_id = $1`, [order.customer_id]);
              await notificationEngine.dispatchNotification(order.customer_id, 'Account Suspended', 'Your account has been temporarily suspended for 7 days due to excessive cancellations.', 'warning', { orderId: order.id });
            }
          } catch (e) {
            console.error('Error in Phase 7A cancellation logic:', e);
          }
        }
      } else if (role === 'seller') {
        // 2. Seller cancellation performance (Only penalize seller if they cancelled)
        await db.query(
          `INSERT INTO seller_performance (shop_id, total_cancelled_orders, trust_score) 
           VALUES ($1, 1, 95) 
           ON CONFLICT (shop_id) 
           DO UPDATE SET 
             total_cancelled_orders = seller_performance.total_cancelled_orders + 1,
             trust_score = GREATEST(0, COALESCE(seller_performance.trust_score, 100) - 5)`,
          [order.shop_id]
        );
      }
      
      // Recalculate seller performance
      await sellerPerformanceService.recalculateSellerPerformance(order.shop_id);
    }

    // Trigger Notification setup
    const notificationEngine = require('../services/notificationEngine');

    if (status === 'Cancelled') {
      // 1. Dispatch to Customer
      await notificationEngine.dispatchNotification(
        order.customer_id,
        'Order Cancelled',
        role === 'seller'
          ? `Your order at ${order.shop_name} was cancelled by the seller. Reason: ${reason || 'None specified'}`
          : `Your order at ${order.shop_name} has been cancelled successfully.`,
        'order_cancelled',
        {
          orderId: order.id,
          customOrderId: order.custom_order_id,
          shopName: order.shop_name,
          customerName: order.customer_name || 'Customer'
        }
      );

      // 2. Dispatch to Seller
      await notificationEngine.dispatchNotification(
        order.seller_user_id,
        'Order Cancelled',
        role === 'customer'
          ? `Order #${order.custom_order_id || order.id} was cancelled by the customer.`
          : `You cancelled Order #${order.custom_order_id || order.id}. Reason: ${reason || 'None specified'}`,
        'order_cancelled',
        {
          orderId: order.id,
          customOrderId: order.custom_order_id,
          shopName: order.shop_name,
          customerName: order.customer_name || 'Customer'
        }
      );

      // Send transactional emails to both customer and seller
      await notificationEngine.dispatchOrderTransactionEmails(updatedOrder.id, originalStatus);
    } else {
      let notifyUserId, notifyMessage, notifType, notifTitle;

      if (role === 'seller') {
        notifyUserId = order.customer_id;
        if (status === 'Ready For Pickup') {
          notifType = 'pickup_ready';
          notifTitle = 'Ready For Pickup';
          notifyMessage = `Your order is ready. Tap here to navigate to the store.`;
        } else if (status === 'Delivered') {
          notifType = 'order_delivered';
          notifTitle = 'Order Delivered';
          notifyMessage = `Your order at ${order.shop_name} has been delivered. Thank you!`;
        }
      } else {
        // Customer actions
        notifyUserId = order.seller_user_id;
        if (status === 'Packing Started') {
          notifType = 'order_confirmed';
          notifTitle = 'Order Confirmed';
          notifyMessage = `Customer approved the digital invoice for Order #${order.custom_order_id || order.id}! You can start packing.`;
        } else if (status === 'Waiting For Seller') {
          notifType = 'revision_requested';
          notifTitle = 'Revision Requested';
          notifyMessage = `Customer requested item modifications for Order #${order.custom_order_id || order.id}. Please review items.`;
        }
      }

      if (notifyUserId && notifType) {
        await notificationEngine.dispatchNotification(
          notifyUserId,
          notifTitle,
          notifyMessage,
          notifType,
          {
            orderId: order.id,
            customOrderId: order.custom_order_id,
            shopName: order.shop_name,
            customerName: order.customer_name || 'Customer',
            pickupOtp: updatedOrder.pickup_otp
          }
        );
      }
      
      // Send transactional emails to both customer and seller
      await notificationEngine.dispatchOrderTransactionEmails(updatedOrder.id, originalStatus);
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

    const originalStatus = order.order_status;

    // Send notifications to Customer
    const message = isDigital 
      ? `Invoice updated for your digital order at ${order.shop_name}! Total amount: ₹${amount}.`
      : `Bill uploaded for your order at ${order.shop_name}! Total amount: ₹${amount}.`;

    const notificationEngine = require('../services/notificationEngine');
    await notificationEngine.dispatchNotification(
      order.customer_id,
      'Bill Generated',
      message,
      'bill_uploaded',
      {
        orderId: order.id,
        customOrderId: order.custom_order_id,
        amount: parseFloat(amount),
        shopName: order.shop_name
      }
    );

    // Send transactional emails to both customer and seller
    await notificationEngine.dispatchOrderTransactionEmails(updatedOrder.id, originalStatus);

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
    const allowedStatuses = ['Confirmed', 'Bill Uploaded', 'Waiting For Customer Confirmation'];
    if (!allowedStatuses.includes(order.order_status)) {
      return res.status(400).json({ error: 'Order must be confirmed after commitment payment or bill upload before proceeding.' });
    }

    if (payment_method === 'Pay During Pickup') {
      const trustResult = await db.query(`SELECT COALESCE(cancellations, 0) as cancellations FROM customer_trust WHERE customer_id = $1`, [order.customer_id]);
      const cancellations = trustResult.rows[0]?.cancellations || 0;
      if (cancellations >= 3) {
        const depositCheck = await db.query(`SELECT 1 FROM commitment_payments WHERE order_id = $1 AND status = 'paid'`, [id]);
        if (depositCheck.rows.length === 0) {
          return res.status(400).json({ error: 'Customers with 3 or more cancellations must pay a ₹50 security deposit via PhonePe to use Pay During Pickup.' });
        }
      }
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

    const originalStatus = order.order_status;

    // Transition status to Packing Started (Skipping Confirmed to streamline flow)
    const result = await db.query(
      `UPDATE orders 
       SET order_status = 'Packing Started', payment_method = $1, payment_status = $2, 
           payment_proof_image = $3, confirmed_at = CURRENT_TIMESTAMP, packing_started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
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

    // Send transactional emails to both customer and seller
    await notificationEngine.dispatchOrderTransactionEmails(updatedOrder.id, originalStatus);

    socketService.emitOrderStatus(updatedOrder, order.customer_id, order.shop_id);

    return res.status(200).json(updatedOrder);
  } catch (err) {
    console.error('Confirm order error:', err);
    return res.status(500).json({ error: 'Server error confirming order.' });
  }
};

// 6. Verify OTP and Mark Delivered (Seller Action)
const verifyOTP = async (req, res) => {
  const { id } = req.params;
  const { otp } = req.body;
  const sellerId = req.user.id;

  if (!otp) {
    return res.status(400).json({ error: 'OTP is required.' });
  }

  try {
    const orderResult = await db.query(
      `SELECT o.*, s.owner_id as seller_user_id 
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
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    if (order.order_status !== 'Ready For Pickup' && order.order_status !== 'Pickup Overdue') {
      return res.status(400).json({ error: 'Order is not ready for pickup.' });
    }

    if (order.pickup_otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP.' });
    }

    const result = await db.query(
      `UPDATE orders 
       SET order_status = $1, 
           otp_verified_at = CURRENT_TIMESTAMP, 
           delivered_at = CURRENT_TIMESTAMP, 
           payment_status = 'Paid', 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 RETURNING *`,
      ['Delivered', id]
    );

    const updatedOrder = result.rows[0];
    await updateShopQueueCount(order.shop_id);


    // Track Seller Performance & Customer Trust
    await db.query(
      `INSERT INTO customer_trust (customer_id, successful_pickups) 
       VALUES ($1, 1) 
       ON CONFLICT (customer_id) 
       DO UPDATE SET successful_pickups = customer_trust.successful_pickups + 1`,
      [order.customer_id]
    );

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

    // Phase 8A: Extract historical prices
    try {
      await priceEngine.extractOrderPrices(updatedOrder.id);
    } catch (e) {
      console.error('Error extracting order prices in verifyOTP:', e);
    }

    // Phase 8B / Phase 6: Savings Engine
    try {
      const estimatedDeliverySavings = 35;
      const myKiranamPrice = parseFloat(order.amount || 0);
      const baseFee = myKiranamPrice * 0.02;
      const gst = baseFee * 0.18;
      const estimatedPlatformSavings = Math.round(baseFee + gst) + 10;

      let marketPriceTotal = 0;
      if (order.order_type === 'digital' && order.modified_item_list) {
        let items = [];
        try {
          items = typeof order.modified_item_list === 'string' ? JSON.parse(order.modified_item_list) : order.modified_item_list;
        } catch(e) {}
        
        for (const item of items) {
           if (!item.name) continue;
           const q = item.name.toLowerCase().trim();
           
           let mPrice = 0;
           if (db.getIsMock && db.getIsMock()) {
               mPrice = parseFloat(item.price || 0) * 1.15;
           } else {
               const match = await db.query('SELECT market_price FROM products_dictionary WHERE product_name ILIKE $1 LIMIT 1', [`%${q}%`]);
               if (match.rows.length > 0) {
                   mPrice = parseFloat(match.rows[0].market_price) || 0;
               } else {
                   mPrice = parseFloat(item.price || 0) * 1.15;
               }
           }
           marketPriceTotal += (mPrice * parseFloat(item.quantity || 1));
        }
      } else {
        marketPriceTotal = myKiranamPrice * 1.15; // Assume 15% higher in online apps
      }
      
      let productSavings = marketPriceTotal - myKiranamPrice;
      if (productSavings < 0) productSavings = 0;

      const totalSavings = estimatedDeliverySavings + estimatedPlatformSavings + Math.round(productSavings);
      const estimatedTimeSaved = 30; // 10m queue + 15m shop + 5m bill

      if (order.customer_id) {
        // Update Customer Savings
        await db.query(
          `INSERT INTO customer_savings (
             customer_id, total_orders, total_savings, total_time_saved, last_order_date, favorite_shop_id
           ) 
           VALUES ($1, 1, $2, $3, CURRENT_TIMESTAMP, $4)
           ON CONFLICT (customer_id)
           DO UPDATE SET 
             total_orders = customer_savings.total_orders + 1,
             total_savings = customer_savings.total_savings + $2,
             total_time_saved = customer_savings.total_time_saved + $3,
             last_order_date = CURRENT_TIMESTAMP,
             favorite_shop_id = $4`,
          [order.customer_id, totalSavings, estimatedTimeSaved, order.shop_id]
        );
      }

      // Update Community Savings
      await db.query(
        `UPDATE community_savings 
         SET total_orders = total_orders + 1,
             total_savings = total_savings + $1,
             total_time_saved = total_time_saved + $2,
             last_updated = CURRENT_TIMESTAMP
         WHERE id = (SELECT MIN(id) FROM community_savings)`,
        [totalSavings, estimatedTimeSaved]
      );
    } catch (err) {
      console.error('Error in Phase 8B Savings logic in verifyOTP:', err);
    }

    const notificationEngine = require('../services/notificationEngine');
    await notificationEngine.dispatchNotification(
      order.customer_id,
      'Order Delivered',
      `Your order at ${order.shop_name || 'the shop'} has been successfully picked up!`,
      'order_delivered',
      { orderId: order.id, amount: order.amount }
    );
    await notificationEngine.dispatchOrderTransactionEmails(updatedOrder.id, order.order_status);

    socketService.emitOrderStatus(updatedOrder, order.customer_id, order.shop_id);

    return res.status(200).json(updatedOrder);
  } catch (err) {
    console.error('Verify OTP error:', err);
    return res.status(500).json({ error: 'Server error verifying OTP.' });
  }
};

// 7. Get Order Chats
const getChats = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const orderResult = await db.query(
      `SELECT o.*, s.owner_id as seller_user_id 
       FROM orders o 
       JOIN shops s ON o.shop_id = s.id 
       WHERE o.id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    const order = orderResult.rows[0];

    if (Number(order.customer_id) !== Number(userId) && Number(order.seller_user_id) !== Number(userId)) {
      return res.status(403).json({ error: 'Unauthorized access to chat.' });
    }

    const chatsResult = await db.query(
      `SELECT * FROM order_chats WHERE order_id = $1 ORDER BY created_at ASC`,
      [id]
    );

    return res.status(200).json(chatsResult.rows);
  } catch (err) {
    console.error('Get chats error:', err);
    return res.status(500).json({ error: 'Server error fetching chats.' });
  }
};

// 8. Send Order Chat
const sendChat = async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  const file = req.file;
  const userId = req.user.id;
  const role = req.user.role;

  if (!message && !file) {
    return res.status(400).json({ error: 'Message or attachment cannot be empty.' });
  }

  try {
    let finalMessage = message ? message.trim() : '';

    if (file) {
      const attachmentUrl = await uploadImage(file);
      if (finalMessage) {
        finalMessage += `\n[Attachment: ${attachmentUrl}]`;
      } else {
        finalMessage = `[Attachment: ${attachmentUrl}]`;
      }
    }

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


    if (Number(order.customer_id) !== Number(userId) && Number(order.seller_user_id) !== Number(userId)) {
      return res.status(403).json({ error: 'Unauthorized to send chat.' });
    }

    const result = await db.query(
      `INSERT INTO order_chats (order_id, sender_id, sender_role, message) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, userId, role, finalMessage]
    );

    const newChat = result.rows[0];

    // Notification
    const recipientId = role === 'seller' ? order.customer_id : order.seller_user_id;
    const senderName = role === 'seller' ? order.shop_name : 'Customer';
    
    const halfLen = Math.max(1, Math.floor(message.length / 2));
    const halfMessage = message.substring(0, halfLen);

    const notificationEngine = require('../services/notificationEngine');
    notificationEngine.dispatchNotification(
      recipientId,
      'New Message',
      `Hey you received a message from ${senderName} about the order please look into it. Preview: ${halfMessage}...`,
      'new_message',
      { orderId: order.id, chatMessage: halfMessage, senderName }
    ).catch(err => console.error('Background notification error:', err));

    socketService.io.emit('new_chat', newChat); // Basic global emit, ideally should emit to room

    return res.status(201).json(newChat);
  } catch (err) {
    console.error('Send chat error:', err);
    return res.status(500).json({ error: 'Server error sending chat.' });
  }
};

const getMarketComparison = async (req, res) => {
  const { id } = req.params;
  try {
    const orderRes = await db.query('SELECT amount, modified_item_list, order_type FROM orders WHERE id = $1', [id]);
    if (orderRes.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    const order = orderRes.rows[0];

    let marketPriceTotal = 0;
    const itemsDetail = [];
    
    if (order.order_type === 'digital' && order.modified_item_list) {
      let items = [];
      try {
        items = typeof order.modified_item_list === 'string' ? JSON.parse(order.modified_item_list) : order.modified_item_list;
      } catch(e) {}
      
      for (const item of items) {
         if (!item.name) continue;
         const q = item.name.toLowerCase().trim();
         
         let mPrice = 0;
         if (db.getIsMock && db.getIsMock()) {
             mPrice = parseFloat(item.price || 0) * 1.15;
         } else {
             const match = await db.query('SELECT market_price FROM products_dictionary WHERE product_name ILIKE $1 LIMIT 1', [`%${q}%`]);
             if (match.rows.length > 0) {
                 mPrice = parseFloat(match.rows[0].market_price) || 0;
             } else {
                 mPrice = parseFloat(item.price || 0) * 1.15;
             }
         }
         marketPriceTotal += (mPrice * parseFloat(item.quantity || 1));
         itemsDetail.push({ name: item.name, my_price: parseFloat(item.price || 0), market_price: mPrice, quantity: item.quantity });
      }
    } else {
      const amt = parseFloat(order.amount || 0);
      marketPriceTotal = amt * 1.15; // Assume 15% higher in online apps
    }
    
    const myKiranamPrice = parseFloat(order.amount || 0);
    let productSavings = marketPriceTotal - myKiranamPrice;
    if (productSavings < 0) productSavings = 0;

    return res.status(200).json({
       marketPriceTotal: Math.round(marketPriceTotal),
       myKiranamPrice: Math.round(myKiranamPrice),
       productSavings: Math.round(productSavings),
       itemsDetail
    });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  createOrder,
  getOrders,
  updateOrderStatus,
  uploadBill,
  confirmOrder,
  verifyOTP,
  getChats,
  sendChat,
  getMarketComparison
};
