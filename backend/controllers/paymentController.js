const crypto = require('crypto');
const db = require('../config/db');

// In-memory token cache for PhonePe V2 (OAuth)
let phonepeAuthToken = null;
let tokenExpiresAt = 0;

/**
 * Retrieves a new OAuth token or reuses the cached one if still valid.
 */
const getPhonePeToken = async (env, clientId, clientSecret) => {
  // If token is active and has at least 1 minute of life left, reuse it
  if (phonepeAuthToken && Date.now() < (tokenExpiresAt - 60000)) {
    return phonepeAuthToken;
  }

  const url = env === 'PROD' 
    ? 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token' 
    : 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token';

  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('client_version', '1');
  params.append('grant_type', 'client_credentials');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  const textData = await response.text();
  let data;
  try {
    data = JSON.parse(textData);
  } catch (e) {
    throw new Error('Invalid non-JSON response from PhonePe Identity Manager: ' + textData.substring(0, 200));
  }

  if (!response.ok || !data.access_token) {
    throw new Error('Failed to generate PhonePe Auth Token. ' + (data.message || JSON.stringify(data)));
  }

  phonepeAuthToken = data.access_token;
  // expires_in is in seconds, typically 3600 (1 hour). We convert to milliseconds.
  const expiresInMs = (data.expires_in || 3600) * 1000;
  tokenExpiresAt = Date.now() + expiresInMs;

  return phonepeAuthToken;
};

const createPhonePeOrder = async (req, res) => {
  const { amount, receipt, order_id, redirect_url, is_security_deposit } = req.body;

  let finalAmount = Math.round(Number(amount));
  // Structure merchantTransactionId so we can always parse order_id from it:
  // e.g. order_86_1718468765223 or sec_dep_86_1718468765223
  let merchantTransactionId = receipt || `order_${order_id || Date.now()}_${Date.now()}`;

  if (is_security_deposit) {
    finalAmount = 5000; // ₹50
    merchantTransactionId = `sec_dep_${order_id || Date.now()}_${Date.now()}`;
  } 
  
  // Ensure transaction ID is max 35 characters
  merchantTransactionId = merchantTransactionId.substring(0, 35);

  if (!finalAmount || finalAmount < 100) {
    return res.status(400).json({ error: 'Amount must be at least 100 paise (₹1.00)' });
  }

  try {
    const clientId = process.env.PHONEPE_CLIENT_ID;
    const clientSecret = process.env.PHONEPE_CLIENT_SECRET;
    const env = process.env.PHONEPE_ENV || 'UAT';

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: 'PhonePe V2 Credentials missing. Please add PHONEPE_CLIENT_ID and PHONEPE_CLIENT_SECRET to .env' });
    }

    const amountInPaise = finalAmount;

    let finalRedirectUrl = redirect_url || `http://localhost:5173/verification?order_id=${order_id}`;
    if (env === 'PROD' && finalRedirectUrl.startsWith('http://')) {
      // PhonePe PROD strictly enforces HTTPS URLs.
      finalRedirectUrl = finalRedirectUrl.replace('http://', 'https://');
    }
    // Append transaction ID so frontend can verify it on redirect
    finalRedirectUrl += (finalRedirectUrl.includes('?') ? '&' : '?') + `transactionId=${merchantTransactionId}`;

    // 1. Fetch OAuth Token
    const token = await getPhonePeToken(env, clientId, clientSecret);

    // 2. Build V2 Payload
    const payload = {
      merchantOrderId: merchantTransactionId,
      amount: amountInPaise,
      paymentFlow: {
        type: "PG_CHECKOUT",
        merchantUrls: {
            redirectUrl: finalRedirectUrl
        }
      }
    };

    const url = env === 'PROD' 
      ? 'https://api.phonepe.com/apis/pg/checkout/v2/pay' 
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay';

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `O-Bearer ${token}`
      },
      body: JSON.stringify(payload)
    };

    // 3. Initiate Payment
    const response = await fetch(url, options);
    const textData = await response.text();
    let data;
    try {
      data = JSON.parse(textData);
    } catch (parseError) {
      console.error('PhonePe non-JSON response:', textData);
      return res.status(502).json({ error: 'PhonePe API returned an invalid response', details: textData.substring(0, 200) });
    }

    // PhonePe V2 typically returns redirectUrl in the root payload directly without a 'success' boolean.
    // Sometimes it may also return state = 'PENDING' or similar.
    let redirectTargetUrl = data.redirectUrl 
      || (data.data && data.data.redirectUrl) 
      || (data.data && data.data.instrumentResponse && data.data.instrumentResponse.redirectInfo && data.data.instrumentResponse.redirectInfo.url);

    if (redirectTargetUrl || (data && data.success)) {
      res.status(200).json({
        success: true,
        redirectUrl: redirectTargetUrl,
        order_id: merchantTransactionId,
        amount: finalAmount,
        currency: 'INR'
      });
    } else {
      console.error('PhonePe API Error:', data);
      const errorMessage = data ? (typeof data === 'object' ? JSON.stringify(data) : data) : 'Unknown PhonePe Error';
      res.status(400).json({ error: `PhonePe Error: ${errorMessage}`, details: data });
    }
  } catch (error) {
    console.error('PhonePe Create Order Error:', error.stack || error.message);
    res.status(500).json({ error: 'Failed to create PhonePe order', details: error.message });
  }
};

/**
 * Shared helper to complete an order payment and perform DB updates/notifications
 */
const completeOrderPayment = async (transactionId, orderId, paymentMethod) => {
  const isSecurityDeposit = transactionId.startsWith('sec_dep_');
  const targetOrderId = orderId || (isSecurityDeposit ? Number(transactionId.split('_')[2]) : Number(transactionId.split('_')[1]));

  if (!targetOrderId || isNaN(targetOrderId)) {
    console.error('Invalid target order ID parsed from transactionId:', transactionId);
    return false;
  }

  // Fetch order details first to get shop_id, seller_user_id, etc.
  const orderResult = await db.query(
    `SELECT o.*, s.owner_id as seller_user_id, s.shop_name 
     FROM orders o 
     JOIN shops s ON o.shop_id = s.id 
     WHERE o.id = $1`,
    [targetOrderId]
  );

  if (orderResult.rows.length === 0) {
    console.error(`Order ID ${targetOrderId} not found in database.`);
    return false;
  }

  const order = orderResult.rows[0];
  const originalStatus = order.order_status;

  // Prevent duplicate updates if already confirmed/paid
  if (isSecurityDeposit && order.order_status === 'Packing Started') {
    console.log(`Order #${targetOrderId} already marked as Packing Started (deposit paid).`);
    return true;
  }
  if (!isSecurityDeposit && order.payment_status === 'Paid') {
    console.log(`Order #${targetOrderId} already marked as Paid.`);
    return true;
  }

  if (isSecurityDeposit) {
    // Update order for security deposit Pay During Pickup
    const updateRes = await db.query(
      `UPDATE orders 
       SET order_status = 'Packing Started',
           payment_status = 'Pending', 
           payment_method = 'Pay During Pickup', 
           confirmed_at = CURRENT_TIMESTAMP,
           packing_started_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [targetOrderId]
    );
    const updatedOrder = updateRes.rows[0];

    // Insert commitment payment record
    await db.query(
      `INSERT INTO commitment_payments (order_id, amount, status, razorpay_payment_id) 
       VALUES ($1, $2, $3, $4)`,
      [targetOrderId, 5000, 'paid', transactionId]
    );

    // Update shop active orders count
    try {
      const activeCountRes = await db.query(
        `SELECT COUNT(*) FROM orders 
         WHERE shop_id = $1 AND order_status IN (
           'Waiting For Seller', 'Accepted', 'Bill Uploaded', 
           'Waiting For Customer Confirmation', 'Confirmed', 'Packing Started', 'Packing Completed'
         )`,
        [order.shop_id]
      );
      const activeCount = parseInt(activeCountRes.rows[0].count);
      await db.query('UPDATE shops SET active_orders = $1 WHERE id = $2', [activeCount, order.shop_id]);
    } catch (queueErr) {
      console.error('Error updating queue in paymentController:', queueErr);
    }

    // Notifications & Socket emit
    try {
      const socketService = require('../services/socketService');
      const notificationEngine = require('../services/notificationEngine');

      socketService.emitOrderStatus(updatedOrder, order.customer_id, order.shop_id);

      const message = `Customer confirmed Order #${order.custom_order_id || order.id} with a ₹50 Security Deposit (Pay During Pickup)!`;
      await notificationEngine.dispatchNotification(
        order.seller_user_id,
        'Order Confirmed',
        message,
        'order_confirmed',
        {
          orderId: order.id,
          customOrderId: order.custom_order_id,
          shopName: order.shop_name,
          paymentMethod: 'Pay During Pickup'
        }
      );

      await notificationEngine.dispatchOrderTransactionEmails(updatedOrder.id, originalStatus);
    } catch (notifErr) {
      console.error('Error sending notifications in paymentController:', notifErr);
    }

  } else {
    // Standard Full Payment confirmed
    const updateRes = await db.query(
      `UPDATE orders 
       SET order_status = 'Packing Started',
           payment_status = 'Paid', 
           payment_method = $1, 
           cashfree_order_id = $2, 
           confirmed_at = CURRENT_TIMESTAMP,
           packing_started_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 RETURNING *`,
      [paymentMethod || 'PhonePe UPI', transactionId, targetOrderId]
    );
    const updatedOrder = updateRes.rows[0];

    // Update shop active orders count
    try {
      const activeCountRes = await db.query(
        `SELECT COUNT(*) FROM orders 
         WHERE shop_id = $1 AND order_status IN (
           'Waiting For Seller', 'Accepted', 'Bill Uploaded', 
           'Waiting For Customer Confirmation', 'Confirmed', 'Packing Started', 'Packing Completed'
         )`,
        [order.shop_id]
      );
      const activeCount = parseInt(activeCountRes.rows[0].count);
      await db.query('UPDATE shops SET active_orders = $1 WHERE id = $2', [activeCount, order.shop_id]);
    } catch (queueErr) {
      console.error('Error updating queue in paymentController:', queueErr);
    }

    try {
      const socketService = require('../services/socketService');
      const notificationEngine = require('../services/notificationEngine');

      socketService.emitOrderStatus(updatedOrder, order.customer_id, order.shop_id);

      const message = `Customer paid for Order #${order.custom_order_id || order.id} online via ${paymentMethod || 'PhonePe UPI'}!`;
      await notificationEngine.dispatchNotification(
        order.seller_user_id,
        'Order Confirmed',
        message,
        'order_confirmed',
        {
          orderId: order.id,
          customOrderId: order.custom_order_id,
          shopName: order.shop_name,
          paymentMethod: paymentMethod || 'PhonePe UPI'
        }
      );

      await notificationEngine.dispatchOrderTransactionEmails(updatedOrder.id, originalStatus);
    } catch (notifErr) {
      console.error('Error sending notifications in paymentController:', notifErr);
    }
  }

  return true;
};

const verifyPhonePePayment = async (req, res) => {
  try {
    const { order_id, payment_method } = req.body; 
    
    const clientId = process.env.PHONEPE_CLIENT_ID;
    const clientSecret = process.env.PHONEPE_CLIENT_SECRET;
    const env = process.env.PHONEPE_ENV || 'UAT';
    
    const transactionId = req.body.transactionId || req.body.merchantTransactionId || req.body.merchantOrderId;
    
    if (!transactionId) {
      return res.status(400).json({ error: 'Missing transaction details' });
    }

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: 'PhonePe V2 Client Credentials missing from .env' });
    }

    // 1. Fetch OAuth Token
    const token = await getPhonePeToken(env, clientId, clientSecret);

    // 2. V2 Status Check
    const url = env === 'PROD' 
      ? `https://api.phonepe.com/apis/pg/checkout/v2/order/${transactionId}/status` 
      : `https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/order/${transactionId}/status`;

    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `O-Bearer ${token}`
      }
    };

    const response = await fetch(url, options);
    const textData = await response.text();
    let data;
    try {
      data = JSON.parse(textData);
    } catch(e) {
      return res.status(502).json({ error: 'PhonePe Status API returned an invalid response', details: textData.substring(0, 200) });
    }

    // As per V2 Checklist: Root-level state parameter determines status
    if (data && data.state === 'COMPLETED') {
      const isSecurityDeposit = transactionId.startsWith('sec_dep_');
      const targetOrderId = order_id || (isSecurityDeposit ? Number(transactionId.split('_')[2]) : Number(transactionId.split('_')[1]));

      await completeOrderPayment(transactionId, targetOrderId, payment_method);
      return res.status(200).json({ success: true, message: 'Payment verified successfully' });
    } else {
      console.error('PhonePe verification failed:', data);
      return res.status(400).json({ success: false, error: 'Payment not successful', status: data.state || 'FAILED', details: data });
    }
  } catch (error) {
    console.error('PhonePe Verification Error:', error.message);
    res.status(500).json({ error: 'Failed to verify PhonePe payment', details: error.message });
  }
};

/**
 * Handle incoming PhonePe webhook callback (S2S)
 */
const handlePhonePeWebhook = async (req, res) => {
  try {
    const xVerify = req.headers['x-verify'];
    const responseBase64 = req.body.response;
    const clientSecret = process.env.PHONEPE_CLIENT_SECRET;
    const saltIndex = process.env.PHONEPE_SALT_INDEX || '1';

    if (!responseBase64) {
      return res.status(400).json({ error: 'Missing response payload' });
    }

    // Verify webhook signature authenticity if credentials are set
    if (xVerify && clientSecret) {
      const crypto = require('crypto');
      const dataToHash = responseBase64 + clientSecret;
      const computedHash = crypto
        .createHash('sha256')
        .update(dataToHash)
        .digest('hex');
      const expectedXVerify = `${computedHash}###${saltIndex}`;
      if (xVerify !== expectedXVerify) {
        console.error('PhonePe Webhook signature verification failed: X-VERIFY mismatch');
        return res.status(400).json({ error: 'Invalid signature' });
      }
    }

    // Decode base64 callback data
    const decodedString = Buffer.from(responseBase64, 'base64').toString('utf-8');
    const payload = JSON.parse(decodedString);

    console.log('PhonePe Webhook Decoded Payload:', payload);
    const success = payload.success;
    const code = payload.code;
    const data = payload.data || {};
    const transactionId = data.merchantTransactionId || data.transactionId || payload.merchantTransactionId;
    const state = data.state || payload.state;

    if (success && (code === 'PAYMENT_SUCCESS' || state === 'COMPLETED')) {
      const isSecurityDeposit = transactionId.startsWith('sec_dep_');
      const orderId = isSecurityDeposit ? Number(transactionId.split('_')[2]) : Number(transactionId.split('_')[1]);

      const completed = await completeOrderPayment(transactionId, orderId, 'PhonePe');
      if (completed) {
        console.log(`PhonePe Webhook: Order #${orderId} marked as Paid successfully via webhook.`);
        return res.status(200).json({ success: true, message: 'Webhook processed successfully' });
      } else {
        console.error(`PhonePe Webhook: Order ID ${orderId} not found or could not be updated.`);
        return res.status(404).json({ error: 'Order not found' });
      }
    } else {
      console.warn('PhonePe Webhook reported payment failure:', payload);
      // PhonePe expects 200 OK even on failures to prevent retry loops
      return res.status(200).json({ success: false, message: 'Failure state acknowledged' });
    }
  } catch (error) {
    console.error('PhonePe Webhook Error:', error.message);
    res.status(500).json({ error: 'Webhook processing failed', details: error.message });
  }
};

const logUpiError = async (req, res) => {
  const { deepLink, browser, deviceType, errorMsg, orderId, upiAppOpened } = req.body;
  
  let upiId = req.body.upiId;
  let amount = req.body.amount;
  let transactionNote = req.body.transactionNote;
  
  if (deepLink) {
    try {
      const urlStr = deepLink.replace('upi://pay', 'http://pay');
      const parsedUrl = new URL(urlStr);
      if (!upiId) upiId = parsedUrl.searchParams.get('pa');
      if (!amount) amount = parsedUrl.searchParams.get('am');
      if (!transactionNote) transactionNote = parsedUrl.searchParams.get('tn');
    } catch (e) {
      // Ignore URL parsing errors
    }
  }

  const logMessage = `[${new Date().toISOString()}] UPI Log: Order ID: ${orderId || 'N/A'} | UPI ID: ${upiId || 'N/A'} | Amount: ${amount || 'N/A'} | Note: ${transactionNote || 'N/A'} | Device: ${deviceType || 'Unknown'} | Browser: ${browser || 'Unknown'} | App: ${upiAppOpened || 'Generic UPI'} | Error: ${errorMsg || 'None'} | Link: ${deepLink || 'None'}\n`;
  
  console.log('📝 LOGGING UPI EVENT:', logMessage.trim());
  
  const fs = require('fs');
  const path = require('path');
  const logFilePath = path.join(__dirname, '../uploads/upi_payment_errors.log');
  
  try {
    const dir = path.dirname(logFilePath);
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.appendFileSync(logFilePath, logMessage, 'utf8');
  } catch (err) {
    console.error('❌ Failed to write to upi_payment_errors.log:', err.message);
  }

  try {
    if (db.getIsMock()) {
      const mockDb = db.getMockDb();
      if (!mockDb.upi_payment_logs) mockDb.upi_payment_logs = [];
      const newLog = {
        id: mockDb.upi_payment_logs.length + 1,
        order_id: orderId ? Number(orderId) : null,
        deep_link: deepLink || '',
        upi_id: upiId || '',
        amount: amount ? Number(amount) : 0.00,
        transaction_note: transactionNote || '',
        browser: browser || 'Unknown',
        device_info: deviceType || 'Unknown',
        upi_app_opened: upiAppOpened || 'Generic UPI',
        error_msg: errorMsg || '',
        created_at: new Date()
      };
      mockDb.upi_payment_logs.push(newLog);
      db.markMockDbDirty();
      db.saveMockDb();
    } else {
      await db.query(
        `INSERT INTO upi_payment_logs 
         (order_id, deep_link, upi_id, amount, transaction_note, browser, device_info, upi_app_opened, error_msg) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          orderId ? Number(orderId) : null,
          deepLink || '',
          upiId || '',
          amount ? Number(amount) : 0.00,
          transactionNote || '',
          browser || 'Unknown',
          deviceType || 'Unknown',
          upiAppOpened || 'Generic UPI',
          errorMsg || ''
        ]
      );
    }
  } catch (dbErr) {
    console.error('❌ Failed to insert UPI log into DB:', dbErr.message);
  }
  
  return res.status(200).json({ success: true });
};

module.exports = {
  createPhonePeOrder,
  verifyPhonePePayment,
  handlePhonePeWebhook,
  logUpiError
};
