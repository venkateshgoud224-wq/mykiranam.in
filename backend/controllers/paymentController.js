const crypto = require('crypto');
const db = require('../config/db');

const createPhonePeOrder = async (req, res) => {
  const { amount, receipt, order_id, redirect_url, is_security_deposit } = req.body;

  let finalAmount = amount;
  let merchantTransactionId = receipt || `order_${Date.now()}`;

  if (is_security_deposit) {
    finalAmount = 5000; // ₹50
    merchantTransactionId = `sec_dep_${order_id || Date.now()}_${Date.now()}`;
  } else if (!finalAmount || finalAmount < 100) {
    return res.status(400).json({ error: 'Amount must be at least 100 paise (₹1.00)' });
  }

  try {
    const merchantId = process.env.PHONEPE_MERCHANT_ID;
    const saltKey = process.env.PHONEPE_SALT_KEY;
    const saltIndex = process.env.PHONEPE_SALT_INDEX;
    const env = process.env.PHONEPE_ENV || 'UAT';

    const amountInPaise = finalAmount;

    let customerId = `cust_${req.user ? req.user.id : Date.now()}`;
    let customerPhone = req.user && req.user.phone ? req.user.phone : "9999999999";

    const payload = {
      merchantId: merchantId,
      merchantTransactionId: merchantTransactionId,
      merchantUserId: customerId,
      amount: amountInPaise,
      redirectUrl: redirect_url || `http://localhost:5173/verification?order_id=${order_id}`,
      redirectMode: "REDIRECT",
      callbackUrl: `https://your-domain.com/api/payment/phonepe/verify`, 
      mobileNumber: customerPhone,
      paymentInstrument: {
        type: "PAY_PAGE"
      }
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
    
    // X-VERIFY = SHA256(base64Payload + "/pg/v1/pay" + saltKey) + "###" + saltIndex
    const stringToHash = base64Payload + "/pg/v1/pay" + saltKey;
    const sha256 = crypto.createHash('sha256').update(stringToHash).digest('hex');
    const xVerify = sha256 + "###" + saltIndex;

    const url = env === 'PROD' 
      ? 'https://api.phonepe.com/apis/hermes/pg/v1/pay' 
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay';

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': xVerify
      },
      body: JSON.stringify({
        request: base64Payload
      })
    };

    const response = await fetch(url, options);
    const data = await response.json();

    if (data && data.success) {
      res.status(200).json({
        success: true,
        redirectUrl: data.data.instrumentResponse.redirectInfo.url,
        order_id: merchantTransactionId,
        amount: amount,
        currency: 'INR'
      });
    } else {
      res.status(400).json({ error: 'Failed to initiate PhonePe payment', details: data });
    }
  } catch (error) {
    console.error('PhonePe Create Order Error:', error.message);
    res.status(500).json({ error: 'Failed to create PhonePe order' });
  }
};

const verifyPhonePePayment = async (req, res) => {
  try {
    const { order_id, payment_method } = req.body; 
    
    const merchantId = process.env.PHONEPE_MERCHANT_ID;
    const saltKey = process.env.PHONEPE_SALT_KEY;
    const saltIndex = process.env.PHONEPE_SALT_INDEX;
    const env = process.env.PHONEPE_ENV || 'UAT';
    
    // transactionId typically passed back from frontend
    const transactionId = req.body.transactionId || req.body.merchantTransactionId;
    
    if (!transactionId) {
      return res.status(400).json({ error: 'Missing transaction details' });
    }

    const stringToHash = `/pg/v1/status/${merchantId}/${transactionId}` + saltKey;
    const sha256 = crypto.createHash('sha256').update(stringToHash).digest('hex');
    const xVerify = sha256 + "###" + saltIndex;

    const url = env === 'PROD' 
      ? `https://api.phonepe.com/apis/hermes/pg/v1/status/${merchantId}/${transactionId}` 
      : `https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/status/${merchantId}/${transactionId}`;

    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': xVerify,
        'X-MERCHANT-ID': merchantId
      }
    };

    const response = await fetch(url, options);
    const data = await response.json();

    if (data && data.code === 'PAYMENT_SUCCESS') {
      const isSecurityDeposit = transactionId.startsWith('sec_dep_');
      const targetOrderId = order_id || (isSecurityDeposit ? Number(transactionId.split('_')[2]) : null);

      if (targetOrderId) {
        // Fetch order details first to get shop_id, seller_user_id, etc.
        const orderResult = await db.query(
          `SELECT o.*, s.owner_id as seller_user_id, s.shop_name 
           FROM orders o 
           JOIN shops s ON o.shop_id = s.id 
           WHERE o.id = $1`,
          [targetOrderId]
        );

        if (orderResult.rows.length > 0) {
          const order = orderResult.rows[0];
          const originalStatus = order.order_status;

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
               SET order_status = 'Confirmed',
                   payment_status = 'Paid', 
                   payment_method = $1, 
                   cashfree_order_id = $2, 
                   confirmed_at = CURRENT_TIMESTAMP,
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = $3 RETURNING *`,
              [payment_method || 'PhonePe UPI', transactionId, targetOrderId]
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
              await notificationEngine.dispatchOrderTransactionEmails(updatedOrder.id, originalStatus);
            } catch (notifErr) {
              console.error('Error sending notifications in paymentController:', notifErr);
            }
          }
        }
      }
      return res.status(200).json({ success: true, message: 'Payment verified successfully' });
    } else {
      return res.status(400).json({ success: false, error: 'Payment not successful', status: data.code });
    }
  } catch (error) {
    console.error('PhonePe Verification Error:', error.message);
    res.status(500).json({ error: 'Failed to verify PhonePe payment' });
  }
};

module.exports = {
  createPhonePeOrder,
  verifyPhonePePayment
};
