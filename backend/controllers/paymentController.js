const Cashfree = require('../utils/cashfree');
const crypto = require('crypto');
const db = require('../config/db');
const notificationEngine = require('../services/notificationEngine');

const createOrder = async (req, res) => {
  const { amount, receipt, order_id } = req.body; // amount is in paise from older Razorpay implementation

  if (!amount || amount < 100) {
    return res.status(400).json({ error: 'Amount must be at least 100 paise (₹1.00)' });
  }

  try {
    const amountInRupees = Number(amount / 100).toFixed(2);
    const cashfreeOrderId = receipt || `order_${Date.now()}`;
    
    // Default customer details (should be replaced with actual user details)
    let customerId = `cust_${req.user ? req.user.id : Date.now()}`;
    let customerPhone = req.user ? req.user.phone : "9999999999";
    let customerEmail = (req.user && req.user.email) ? req.user.email : "user@example.com";

    const request = {
      order_amount: amountInRupees,
      order_currency: 'INR',
      order_id: cashfreeOrderId,
      customer_details: {
        customer_id: customerId,
        customer_phone: customerPhone,
        customer_email: customerEmail
      }
    };

    // Cashfree Easy Split Automated Payout
    if (order_id) {
      const orderRes = await db.query('SELECT shop_id, customer_id FROM orders WHERE id = $1', [order_id]);
      if (orderRes.rows.length > 0) {
        const shop_id = orderRes.rows[0].shop_id;
        const shopRes = await db.query('SELECT cashfree_vendor_id FROM shops WHERE id = $1', [shop_id]);
        
        if (shopRes.rows.length > 0 && shopRes.rows[0].cashfree_vendor_id) {
          const vendorId = shopRes.rows[0].cashfree_vendor_id;
          
          // Allocate 100% to the seller (0% commission)
          request.order_splits = [
            {
              vendor_id: vendorId,
              percentage: 100
            }
          ];
        }
      }
    }

    const response = await Cashfree.PGCreateOrder("2022-09-01", request);
    
    if (!response || !response.data) {
      return res.status(500).json({ error: 'Some error occurred with Cashfree API' });
    }

    res.status(200).json({
      order_id: response.data.order_id,
      payment_session_id: response.data.payment_session_id,
      amount: amount, // Send back original amount format for frontend compatibility if needed
      currency: response.data.order_currency
    });
  } catch (error) {
    console.error('Cashfree Create Order Error:', error.response ? error.response.data : error);
    res.status(500).json({ error: 'Failed to create Cashfree order' });
  }
};

const verifyPayment = async (req, res) => {
  const {
    cashfree_order_id,
    cashfree_session_id,
    order_id
  } = req.body;

  if (!cashfree_order_id) {
    return res.status(400).json({ error: 'Missing payment details' });
  }

  try {
    // Verify payment status with Cashfree API
    const response = await Cashfree.PGFetchOrder("2022-09-01", cashfree_order_id);
    
    if (response.data.order_status === "PAID") {
      // Payment is successful
      
      // If we have an internal order ID, we should update it
      if (order_id) {
        await db.query(
          `UPDATE orders 
           SET order_status = 'Confirmed',
               payment_status = 'Paid', 
               payment_method = 'Cashfree UPI', 
               cashfree_order_id = $1, 
               cashfree_session_id = $2,
               confirmed_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [cashfree_order_id, cashfree_session_id || null, order_id]
        );
      }

      return res.status(200).json({ success: true, message: 'Payment verified successfully' });
    } else {
      return res.status(400).json({ success: false, error: 'Payment not successful', status: response.data.order_status });
    }
  } catch (error) {
    console.error('Cashfree Verification Error:', error.response ? error.response.data : error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
};

const refundPayment = async (req, res) => {
  const { id } = req.params; // order id

  try {
    const orderRes = await db.query(
      `SELECT o.*, s.owner_id as seller_user_id 
       FROM orders o 
       JOIN shops s ON o.shop_id = s.id 
       WHERE o.id = $1`,
      [id]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderRes.rows[0];

    // Ensure the seller is the one requesting the refund
    if (Number(order.seller_user_id) !== Number(req.user.id)) {
      return res.status(403).json({ error: 'Not authorized to refund this order' });
    }

    // Verify order is eligible for refund
    if (order.order_status !== 'Cancelled') {
      return res.status(400).json({ error: 'Order must be cancelled before refunding' });
    }
    
    if (order.payment_status === 'Refunded' || order.refund_status === 'Processed') {
      return res.status(400).json({ error: 'Order has already been refunded' });
    }

    if (order.payment_method !== 'Cashfree UPI' && order.payment_method !== 'Razorpay UPI') {
      return res.status(400).json({ error: 'Order payment method does not support online refund processing.' });
    }

    if (!order.cashfree_order_id) {
        return res.status(400).json({ error: 'No Cashfree order ID associated with this order' });
    }

    const refundAmount = Number(order.amount / 100).toFixed(2);
    const refundRequest = {
      refund_amount: parseFloat(refundAmount),
      refund_id: `refund_${order.id}_${Date.now()}`,
      refund_note: "Order cancelled"
    };

    const refundData = await Cashfree.PGCreateRefund("2022-09-01", order.cashfree_order_id, refundRequest);

    if (!refundData || !refundData.data) {
      return res.status(500).json({ error: 'Failed to process refund with Cashfree' });
    }

    // Update database
    await db.query(
      `UPDATE orders 
       SET payment_status = 'Refunded', 
           refund_id = $1, 
           refund_status = 'Processed', 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [refundData.data.refund_id, id]
    );

    // Dispatch notification to customer
    await notificationEngine.dispatchNotification(
      order.customer_id,
      'Refund Processed',
      `Your refund of ₹${parseFloat(order.amount / 100).toFixed(2)} for cancelled Order #${order.custom_order_id || order.id} has been processed via Cashfree. It will reflect in your original payment method in 5-7 business days.`,
      'refund_processed',
      { orderId: order.id, amount: order.amount, refundId: refundData.data.refund_id }
    );

    return res.status(200).json({ success: true, message: 'Refund processed successfully via Cashfree', refundId: refundData.data.refund_id });
  } catch (error) {
    console.error('Cashfree Refund Error:', error.response ? error.response.data : error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
};

const createPhonePeOrder = async (req, res) => {
  const { amount, receipt, order_id, redirect_url } = req.body;

  if (!amount || amount < 100) {
    return res.status(400).json({ error: 'Amount must be at least 100 paise (₹1.00)' });
  }

  try {
    const merchantId = process.env.PHONEPE_MERCHANT_ID;
    const saltKey = process.env.PHONEPE_SALT_KEY;
    const saltIndex = process.env.PHONEPE_SALT_INDEX;
    const env = process.env.PHONEPE_ENV || 'UAT';

    const merchantTransactionId = receipt || `order_${Date.now()}`;
    const amountInPaise = amount;

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
    const { order_id } = req.body; 
    
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
      if (order_id) {
        await db.query(
          `UPDATE orders 
           SET order_status = 'Confirmed',
               payment_status = 'Paid', 
               payment_method = 'PhonePe UPI', 
               cashfree_order_id = $1, 
               confirmed_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [transactionId, order_id]
        );
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
  createOrder,
  verifyPayment,
  refundPayment,
  createPhonePeOrder,
  verifyPhonePePayment
};
