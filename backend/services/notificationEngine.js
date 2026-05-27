const db = require('../config/db');
const socketService = require('./socketService');
const emailService = require('./emailService');
const whatsappService = require('./whatsappService');

/**
 * Centralized function to dispatch notifications to customers or sellers.
 * Automatically handles Socket.IO realtime emissions vs Offline fallbacks.
 * 
 * @param {number} userId - ID of the target user
 * @param {string} title - Header text
 * @param {string} message - Main description
 * @param {string} type - Event type (e.g., 'new_order', 'bill_uploaded', 'order_status')
 * @param {object} metadata - Extra details (e.g. orderId, amount, shopName, customerName)
 */
const dispatchNotification = async (userId, title, message, type, metadata = {}) => {
  try {
    const uid = Number(userId);
    // 1. Fetch user notification preferences
    const userRes = await db.query(
      'SELECT id, name, email, phone, whatsapp_number, verified_whatsapp, pref_browser_notif, pref_sounds, pref_whatsapp, pref_email FROM users WHERE id = $1',
      [uid]
    );

    if (userRes.rows.length === 0) {
      console.error(`❌ Notification Engine: User #${uid} not found.`);
      return { success: false, error: 'User not found' };
    }

    const user = userRes.rows[0];
    const isOnline = socketService.getActiveSocketCount(uid) > 0;
    
    console.log(`🔔 Notification Engine: Processing event "${type}" for user "${user.name}" (Online: ${isOnline})`);

    let finalChannel = 'Web';
    let sentStatus = 'Sent';

    const dispatches = [];
    const channelsUsed = [];

    // 2. Realtime Dispatch if online
    if (isOnline) {
      // Respect user's browser notification preferences
      if (user.pref_browser_notif) {
        // Emit Socket Event
        const notifPayload = {
          id: Date.now(), // Temp or DB ID
          user_id: uid,
          title,
          message,
          type,
          channel: 'Web',
          read_status: false,
          created_at: new Date()
        };
        
        socketService.sendNotification(uid, notifPayload);
        channelsUsed.push('Web');
      }
    }

    // 3. WhatsApp: Always send if user has a verified WhatsApp number and the event is one of the 5 key events (or cancellation/revision/OTP)
    const allowedWhatsAppTypes = [
      'new_order',
      'bill_uploaded',
      'order_confirmed',
      'pickup_ready',
      'order_delivered',
      'order_cancelled',
      'revision_requested'
    ];

    if (user.whatsapp_number && user.verified_whatsapp && allowedWhatsAppTypes.includes(type)) {
      channelsUsed.push('WhatsApp');
      
      let waPromise;
      const displayOrderId = metadata.customOrderId || metadata.orderId;
      const orderIdStr = metadata.customOrderId || (metadata.orderId ? `KRN${metadata.orderId}` : '');
      const customerName = metadata.customerName || 'Customer';
      const shopName = metadata.shopName || 'Shop';
      const amount = metadata.amount || '0.00';

      if (type === 'new_order') {
        waPromise = whatsappService.sendSellerNewOrderWhatsApp(
          user.whatsapp_number,
          displayOrderId,
          customerName,
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        );
      } else if (type === 'bill_uploaded') {
        waPromise = whatsappService.sendCustomerBillUploadedWhatsApp(
          user.whatsapp_number,
          displayOrderId,
          amount,
          shopName
        );
      } else if (type === 'order_confirmed') {
        const text = `Order Confirmed!\n\n📦 Order ID: ${orderIdStr}\n👤 Customer: ${customerName}\n\nPlease proceed to pack the groceries and mark the order as "Ready for Pickup" when completed.`;
        waPromise = whatsappService.sendWhatsAppMessage(
          user.whatsapp_number,
          '✅ Order Confirmed',
          text
        );
      } else if (type === 'pickup_ready') {
        const text = `Your grocery bag is packed and waiting for you at ${shopName}!\n\n📦 Order ID: ${orderIdStr}\n🏪 Status: Ready for Pickup\n\nPlease present your Order ID at the counter to skip the queue.`;
        waPromise = whatsappService.sendWhatsAppMessage(
          user.whatsapp_number,
          '🎒 Ready for Pickup',
          text
        );
      } else if (type === 'order_delivered') {
        const text = `Thank you for shopping through Kiranam.in!\n\n📦 Order ID: ${orderIdStr}\n🏪 Shop: ${shopName}\n💰 Paid Amount: ₹${amount}\n\nYour order has been successfully collected and marked as delivered.`;
        waPromise = whatsappService.sendWhatsAppMessage(
          user.whatsapp_number,
          '🛍️ Order Delivered',
          text
        );
      } else if (type === 'order_cancelled') {
        const text = `Order Cancelled!\n\n📦 Order ID: ${orderIdStr}\n🏪 Shop: ${shopName}\n👤 Customer: ${customerName}\n\nThis transaction has been cancelled.`;
        waPromise = whatsappService.sendWhatsAppMessage(
          user.whatsapp_number,
          '❌ Order Cancelled',
          text
        );
      } else if (type === 'revision_requested') {
        const text = `Revision Requested!\n\n📦 Order ID: ${orderIdStr}\n👤 Customer: ${customerName}\n\nThe customer has requested revision/modifications to their order. Please review items and update the bill.`;
        waPromise = whatsappService.sendWhatsAppMessage(
          user.whatsapp_number,
          '🔄 Revision Requested',
          text
        );
      }

      if (waPromise) {
        dispatches.push(waPromise);
      }
    } else {
      console.log(`ℹ️ WhatsApp Dispatch skipped/unsupported for User #${uid}. Type: ${type}, Number: ${user.whatsapp_number}, Verified: ${user.verified_whatsapp}`);
    }

    // 4. Email fallback: Send if offline
    const orderEvents = ['new_order', 'order_placed', 'bill_uploaded', 'order_confirmed', 'pickup_ready', 'order_delivered', 'order_cancelled', 'revision_requested'];

    if (!isOnline && !orderEvents.includes(type)) {
      if (user.pref_email && user.email) {
        channelsUsed.push('Email');
        
        let emailPromise;
        if (type === 'signup') {
          emailPromise = emailService.sendSignupEmail(user.email, user.name);
        } else {
          // General notification fallback
          emailPromise = emailService.sendMail({
            to: user.email,
            subject: title,
            title: title,
            htmlContent: `<p>${message}</p>`,
            textFallback: message
          });
        }
        dispatches.push(emailPromise);
      } else {
        console.log(`ℹ️ Email Fallback skipped for User #${uid}. Pref: ${user.pref_email}, Email: ${user.email}`);
      }
    } else if (!isOnline) {
      console.log(`ℹ️ Email Fallback skipped for User #${uid}. Event '${type}' is handled by transaction emails.`);
    }

    // Set logs details
    if (channelsUsed.length > 1) {
      finalChannel = 'Multiple';
    } else if (channelsUsed.length === 1) {
      finalChannel = channelsUsed[0];
    } else {
      finalChannel = isOnline ? 'Web' : 'None';
      sentStatus = isOnline ? 'Sent' : 'Failed';
    }

    // Await async triggers
    if (dispatches.length > 0) {
      await Promise.all(dispatches);
    }

    // 4. Record Notification history in database
    const insertRes = await db.query(
      'INSERT INTO notifications (user_id, title, message, type, channel, read_status, sent_status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at',
      [uid, title, message, type, finalChannel, false, sentStatus]
    );

    console.log(`💾 Saved notification log to database: ID #${insertRes.rows[0].id} (Channel: ${finalChannel})`);
    return { success: true, notifId: insertRes.rows[0].id };
  } catch (err) {
    console.error('❌ Notification Engine Dispatch Error:', err.message);
    return { success: false, error: err.message };
  }
};

const dispatchOrderTransactionEmails = async (orderId, originalStatus) => {
  try {
    const orderRes = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    if (orderRes.rows.length === 0) {
      console.error(`❌ dispatchOrderTransactionEmails: Order #${orderId} not found.`);
      return;
    }
    const order = orderRes.rows[0];

    // Restrict emails to only 3 specific milestones
    const allowedStatuses = ['Waiting For Seller', 'Bill Uploaded', 'Ready For Pickup'];
    if (!allowedStatuses.includes(order.order_status)) {
      console.log(`ℹ️ dispatchOrderTransactionEmails: Skipping email dispatch for Status '${order.order_status}'. Not in allowed milestones.`);
      return;
    }

    // Skip revision requests (Waiting For Seller when originalStatus is Bill Uploaded/Waiting For Customer Confirmation)
    if (order.order_status === 'Waiting For Seller' && (originalStatus === 'Bill Uploaded' || originalStatus === 'Waiting For Customer Confirmation')) {
      console.log(`ℹ️ dispatchOrderTransactionEmails: Skipping email dispatch for Revision Request.`);
      return;
    }

    const customerRes = await db.query('SELECT name, email, pref_email FROM users WHERE id = $1', [order.customer_id]);
    if (customerRes.rows.length === 0) {
      console.error(`❌ dispatchOrderTransactionEmails: Customer #${order.customer_id} not found.`);
      return;
    }
    const customer = customerRes.rows[0];

    const shopRes = await db.query('SELECT shop_name, owner_id FROM shops WHERE id = $1', [order.shop_id]);
    if (shopRes.rows.length === 0) {
      console.error(`❌ dispatchOrderTransactionEmails: Shop #${order.shop_id} not found.`);
      return;
    }
    const shop = shopRes.rows[0];

    const sellerRes = await db.query('SELECT name, email, pref_email FROM users WHERE id = $1', [shop.owner_id]);
    if (sellerRes.rows.length === 0) {
      console.error(`❌ dispatchOrderTransactionEmails: Seller owner #${shop.owner_id} not found.`);
      return;
    }
    const seller = sellerRes.rows[0];

    // Respect user email preferences
    if (customer.pref_email === false) customer.email = null;
    if (seller.pref_email === false) seller.email = null;

    await emailService.sendOrderTransactionEmails(order, customer, shop, seller, originalStatus);
    console.log(`📬 dispatchOrderTransactionEmails: Successfully sent transaction emails for Order #${orderId} [Status: ${order.order_status}, Original Status: ${originalStatus || 'none'}]`);
  } catch (err) {
    console.error('❌ dispatchOrderTransactionEmails error:', err.message);
  }
};

module.exports = {
  dispatchNotification,
  dispatchOrderTransactionEmails
};
